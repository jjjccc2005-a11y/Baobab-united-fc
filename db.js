import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const databasePath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'baobab.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });
const database = new DatabaseSync(databasePath);

database.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS fixtures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opponent TEXT NOT NULL,
    opponent_short TEXT NOT NULL,
    match_date TEXT NOT NULL,
    competition TEXT NOT NULL,
    venue TEXT,
    home_away TEXT NOT NULL CHECK (home_away IN ('Home', 'Away')),
    baobab_score INTEGER,
    opponent_score INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled',
    standings_applied INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS standings (
    position INTEGER PRIMARY KEY,
    club TEXT NOT NULL,
    played INTEGER NOT NULL,
    wins INTEGER NOT NULL,
    draws INTEGER NOT NULL,
    losses INTEGER NOT NULL,
    goal_difference INTEGER NOT NULL,
    points INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    alt_text TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    price_pence INTEGER,
    status TEXT NOT NULL DEFAULT 'coming-soon'
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    csrf_token TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

try { database.exec('ALTER TABLE sessions ADD COLUMN csrf_token TEXT NOT NULL DEFAULT \'legacy\''); } catch { /* Existing databases already have the column. */ }
try { database.exec('ALTER TABLE fixtures ADD COLUMN standings_applied INTEGER NOT NULL DEFAULT 0'); } catch { /* Existing databases already have the column. */ }
database.prepare(`UPDATE fixtures SET standings_applied = 1 WHERE opponent = ? AND match_date = ? AND baobab_score = ? AND opponent_score = ?`).run('Mickleover R B L Reserves', '2026-09-05', 2, 1);

const hasFixtures = database.prepare('SELECT COUNT(*) AS count FROM fixtures').get().count;
if (hasFixtures === 0) {
  database.prepare(`INSERT INTO fixtures
    (opponent, opponent_short, match_date, competition, venue, home_away, baobab_score, opponent_score, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run('Mickleover R B L Reserves', 'MRB', '2026-09-05', 'Abacus Lighting Central Midlands Alliance League', 'Away', 'Away', 2, 1, 'played');
}

const hasStandings = database.prepare('SELECT COUNT(*) AS count FROM standings').get().count;
if (hasStandings === 0) {
  const rows = [
    ['Castle Donington FC', 1, 1, 0, 0, 5, 3], ['Little Eaton FC', 1, 1, 0, 0, 4, 3],
    ['Rising Stars FC', 1, 1, 0, 0, 1, 3], ['Mayfield FC', 1, 1, 0, 0, 1, 3],
    ['Baobab United FC', 1, 1, 0, 0, 1, 3], ['Melbourne Dynamo Reserves', 1, 0, 1, 0, 0, 1],
    ['Stockbrook United FC', 1, 0, 1, 0, 0, 1], ['Burton United FC', 0, 0, 0, 0, 0, 0],
    ['Markeaton FC', 1, 0, 0, 1, -1, 0], ['Burton Hornets FC', 1, 0, 0, 1, -1, 0],
    ['Mickleover R B L Reserves', 1, 0, 0, 1, -1, 0], ['Ingles Reserves FC', 1, 0, 0, 1, -4, 0],
    ['Hemington Hammers FC', 1, 0, 0, 1, -5, 0]
  ];
  const insert = database.prepare(`INSERT INTO standings
    (position, club, played, wins, draws, losses, goal_difference, points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  rows.forEach((row, index) => insert.run(index + 1, ...row));
}

export function getTeamData() {
  return {
    fixtures: database.prepare('SELECT * FROM fixtures ORDER BY match_date DESC').all(),
    standings: database.prepare('SELECT * FROM standings ORDER BY position').all()
  };
}

export function recordFixture(fixture) {
  const insertFixture = database.prepare(`INSERT INTO fixtures
    (opponent, opponent_short, match_date, competition, venue, home_away, baobab_score, opponent_score, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const updateStanding = database.prepare(`UPDATE standings SET
    played = played + 1,
    wins = wins + ?,
    draws = draws + ?,
    losses = losses + ?,
    goal_difference = goal_difference + ?,
    points = points + ?
    WHERE club = ?`);
  const insertStanding = database.prepare(`INSERT INTO standings
    (position, club, played, wins, draws, losses, goal_difference, points)
    VALUES (0, ?, ?, ?, ?, ?, ?, ?)`);

  database.exec('BEGIN');
  try {
    const result = insertFixture.run(
      fixture.opponent, fixture.opponent_short, fixture.match_date, fixture.competition,
      fixture.venue || '', fixture.home_away, fixture.baobab_score ?? null,
      fixture.opponent_score ?? null, fixture.status || 'scheduled'
    );

    if (fixture.status === 'played' && Number.isInteger(fixture.baobab_score) && Number.isInteger(fixture.opponent_score)) {
      const baobabOutcome = fixture.baobab_score > fixture.opponent_score ? [1, 0, 0, fixture.baobab_score - fixture.opponent_score, 3]
        : fixture.baobab_score === fixture.opponent_score ? [0, 1, 0, 0, 1]
          : [0, 0, 1, fixture.baobab_score - fixture.opponent_score, 0];
      const opponentOutcome = fixture.opponent_score > fixture.baobab_score ? [1, 0, 0, fixture.opponent_score - fixture.baobab_score, 3]
        : fixture.opponent_score === fixture.baobab_score ? [0, 1, 0, 0, 1]
          : [0, 0, 1, fixture.opponent_score - fixture.baobab_score, 0];

      const baobabExists = database.prepare('SELECT 1 AS found FROM standings WHERE club = ?').get('Baobab United FC');
      if (baobabExists) updateStanding.run(...baobabOutcome, 'Baobab United FC');
      else insertStanding.run('Baobab United FC', 1, ...baobabOutcome);

      const opponentExists = database.prepare('SELECT 1 AS found FROM standings WHERE club = ?').get(fixture.opponent);
      if (opponentExists) updateStanding.run(...opponentOutcome, fixture.opponent);
      else insertStanding.run(fixture.opponent, 1, ...opponentOutcome);

      database.prepare('UPDATE fixtures SET standings_applied = 1 WHERE id = ?').run(Number(result.lastInsertRowid));

      reindexStandings();
    }

    database.exec('COMMIT');
    return Number(result.lastInsertRowid);
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function deleteFixture(id) {
  const fixture = database.prepare('SELECT * FROM fixtures WHERE id = ?').get(id);
  if (!fixture) return false;
  database.exec('BEGIN');
  try {
    if (fixture.standings_applied && fixture.status === 'played' && Number.isInteger(fixture.baobab_score) && Number.isInteger(fixture.opponent_score)) {
      const baobabOutcome = fixture.baobab_score > fixture.opponent_score ? [1, 0, 0, fixture.baobab_score - fixture.opponent_score, 3]
        : fixture.baobab_score === fixture.opponent_score ? [0, 1, 0, 0, 1]
          : [0, 0, 1, fixture.baobab_score - fixture.opponent_score, 0];
      const opponentOutcome = fixture.opponent_score > fixture.baobab_score ? [1, 0, 0, fixture.opponent_score - fixture.baobab_score, 3]
        : fixture.opponent_score === fixture.baobab_score ? [0, 1, 0, 0, 1]
          : [0, 0, 1, fixture.opponent_score - fixture.baobab_score, 0];
      const reverse = database.prepare(`UPDATE standings SET played = played - 1, wins = wins - ?, draws = draws - ?, losses = losses - ?, goal_difference = goal_difference - ?, points = points - ? WHERE club = ?`);
      reverse.run(...baobabOutcome, 'Baobab United FC');
      reverse.run(...opponentOutcome, fixture.opponent);
      database.prepare('DELETE FROM standings WHERE club = ? AND played <= 0').run(fixture.opponent);
      reindexStandings();
    }
    database.prepare('DELETE FROM fixtures WHERE id = ?').run(id);
    database.exec('COMMIT');
    return true;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function reindexStandings() {
  const ordered = database.prepare(`SELECT club FROM standings ORDER BY points DESC, goal_difference DESC, wins DESC, position ASC, club ASC`).all();
  database.prepare('UPDATE standings SET position = position + 1000').run();
  const reposition = database.prepare('UPDATE standings SET position = ? WHERE club = ?');
  ordered.forEach((row, index) => reposition.run(index + 1, row.club));
}

export function getDatabase() {
  return database;
}

export async function backupDatabase(destination) {
  database.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  copyFileSync(databasePath, destination);
}
