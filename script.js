const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
const navLinks = document.querySelectorAll('.nav-link');
const toast = document.querySelector('.toast');

document.querySelectorAll('.site-footer span').forEach((footerYear) => {
	footerYear.textContent = footerYear.textContent.replace('2024', '2020');
});

document.querySelectorAll('.crest').forEach((crest) => {
	if (!crest.querySelector('img')) {
		const logo = document.createElement('img');
		logo.src = 'images/logo.jpeg';
		logo.alt = 'Baobab United FC logo';
		crest.replaceChildren(logo);
	}
});

if (menuToggle && mainNav) {
	menuToggle.addEventListener('click', () => {
		const isOpen = mainNav.classList.toggle('open');
		menuToggle.setAttribute('aria-expanded', isOpen);
		menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
	});
}

navLinks.forEach((link) => {
	link.addEventListener('click', () => {
		navLinks.forEach((item) => item.classList.remove('active'));
		link.classList.add('active');
		if (mainNav && menuToggle) {
			mainNav.classList.remove('open');
			menuToggle.setAttribute('aria-expanded', 'false');
			menuToggle.setAttribute('aria-label', 'Open navigation');
		}
	});
});

document.querySelectorAll('[data-toast]').forEach((button) => {
	button.addEventListener('click', () => {
		if (!toast) return;
		toast.textContent = button.dataset.toast;
		toast.classList.add('show');
		window.setTimeout(() => toast.classList.remove('show'), 3000);
	});
});

document.querySelectorAll('[data-toast-form]').forEach((form) => {
	form.addEventListener('submit', (event) => {
		event.preventDefault();
		if (!toast) return;
		toast.textContent = 'Thanks, your message has been received.';
		toast.classList.add('show');
		form.reset();
		window.setTimeout(() => toast.classList.remove('show'), 3000);
	});
});

document.querySelectorAll('.filter-button').forEach((button) => {
	button.addEventListener('click', () => {
		document.querySelectorAll('.filter-button').forEach((item) => item.classList.remove('active'));
		button.classList.add('active');
	});
});

const sections = document.querySelectorAll('main section[id]');
const sectionObserver = new IntersectionObserver((entries) => {
	entries.forEach((entry) => {
		if (entry.isIntersecting) {
			navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
		}
	});
}, { rootMargin: '-35% 0px -55% 0px' });

sections.forEach((section) => sectionObserver.observe(section));

async function loadTeamData() {
	const fixtureLayout = document.querySelector('.fixture-layout');
	const leagueTable = document.querySelector('.league-table');
	if (!fixtureLayout || !leagueTable || !window.location.protocol.startsWith('http')) return;

	try {
		const devPorts = new Set(['3000', '4173', '5500']);
		const apiOrigin = devPorts.has(window.location.port) ? 'http://localhost:3001' : '';
		const response = await fetch(`${apiOrigin}/api/team`);
		if (!response.ok) throw new Error('Team data unavailable');
		const data = await response.json();
		const latest = data.fixtures[0];
		if (!latest) return;

		const date = new Date(`${latest.match_date}T12:00:00`);
		const day = date.toLocaleDateString('en-GB', { day: '2-digit' });
		const month = date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
		const year = date.getFullYear();
		const isWin = latest.baobab_score > latest.opponent_score;
		const baobabRow = data.standings.find((row) => row.club === 'Baobab United FC');

		fixtureLayout.innerHTML = `<div class="next-match glass-panel">
			<div class="match-label"><span class="live-dot"></span> Latest result <span class="match-competition">${latest.competition.split(' League')[0]}</span></div>
			<div class="match-date"><strong>${day}</strong><span>${month}<br><b>${year}</b></span></div>
			<div class="opponents"><div class="team-mark opponent-mark">${latest.opponent_short}</div><span>${latest.opponent_score} &#8212; ${latest.baobab_score}</span><div class="team-mark baobab-mark">BU</div></div>
			<div class="opponent-names"><strong>${latest.opponent}</strong><strong>Baobab United FC</strong></div>
			<div class="match-meta"><span>Result</span><span>${isWin ? 'Baobab United won' : 'Match recorded'}</span></div>
			<a class="button button-outline match-button" href="https://fulltime.thefa.com/index.html?league=1854955&amp;selectedSeason=556342931&amp;selectedDivision=789799381&amp;selectedCompetition=0&amp;selectedFixtureGroupKey=1_872585558" target="_blank" rel="noopener">View on The FA <span>&#8599;</span></a>
		</div><div class="fixture-list"><div class="list-heading"><span>Baobab fixtures</span><span>SQLite source</span></div>
			<article class="fixture-row"><time><b>${day}</b><span>${month} ${String(year).slice(-2)}</span></time><div><strong>${latest.opponent}</strong><small>${latest.home_away} &#183; League</small></div><span class="versus">${latest.opponent_score}&#8212;${latest.baobab_score}</span><div class="small-mark">${isWin ? 'W' : 'L'}</div></article>
			<div class="results-line"><span class="eyebrow">Current record</span><strong>Played <b>${baobabRow?.played ?? 0}</b> &#183; Won <b>${baobabRow?.wins ?? 0}</b> &#183; Points <b>${baobabRow?.points ?? 0}</b></strong><span class="win">${baobabRow?.position ?? '-'}th</span></div>
			<p class="source-note">Loaded from the local SQLite database.</p></div>`;

		leagueTable.innerHTML = `<div class="table-row table-header"><span>Club</span><span>PL</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>PTS</span></div>${data.standings.map((row) => `<div class="table-row${row.club === 'Baobab United FC' ? ' current' : ''}"><strong><b>${String(row.position).padStart(2, '0')}</b> ${row.club}</strong><span>${row.played}</span><span>${row.wins}</span><span>${row.draws}</span><span>${row.losses}</span><span>${row.goal_difference > 0 ? '+' : ''}${row.goal_difference}</span><strong>${row.points}</strong></div>`).join('')}`;
	} catch (error) {
		console.warn('Using static team fallback:', error.message);
	}
}

loadTeamData();

async function loadMediaData() {
	const gallery = document.querySelector('.full-gallery');
	if (!gallery || !window.location.protocol.startsWith('http')) return;
	try {
		const devPorts = new Set(['3000', '4173', '5500']);
		const response = await fetch(`${devPorts.has(window.location.port) ? 'http://localhost:3001' : ''}/api/media`);
		if (!response.ok) return;
		const media = await response.json();
		if (!media.length) return;
		gallery.innerHTML = media.map((item, index) => `<figure class="media-card${index === 0 ? ' media-large' : ''}"><img src="${item.image_url}" alt="${item.alt_text}"><figcaption><span>${item.category}</span><strong>${item.title}</strong></figcaption></figure>`).join('');
	} catch (error) { console.warn('Using static media fallback:', error.message); }
}

loadMediaData();
