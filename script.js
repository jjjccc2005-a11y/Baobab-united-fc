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

const apiOrigin = (() => {
	const devPorts = new Set(['3000', '4173', '5500']);
	return devPorts.has(window.location.port) ? 'http://localhost:3001' : '';
})();

document.querySelectorAll('[data-toast-form]').forEach((form) => {
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		const formData = Object.fromEntries(new FormData(form).entries());
		const payload = {
			source: form.dataset.source || 'contact',
			name: formData.name || formData['full-name'] || formData['contact-name'] || 'Website visitor',
			subject: formData.subject || (form.dataset.source === 'shop' ? 'Early access sign-up' : 'General enquiry'),
			email: formData.email || formData['shop-email'] || '',
			message: formData.message || formData.details || 'No extras added.'
		};
		if (!payload.email || !payload.message) {
			if (!toast) return;
			toast.textContent = 'Please complete the required fields.';
			toast.classList.add('show');
			window.setTimeout(() => toast.classList.remove('show'), 3000);
			return;
		}
		try {
			const response = await fetch(`${apiOrigin}/api/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || 'Message not sent');
			if (!toast) return;
			toast.textContent = form.dataset.success || 'Thanks, your message has been received.';
			toast.classList.add('show');
			form.reset();
			window.setTimeout(() => toast.classList.remove('show'), 3000);
		} catch (error) {
			if (!toast) return;
			toast.textContent = error.message || 'Unable to send message right now.';
			toast.classList.add('show');
			window.setTimeout(() => toast.classList.remove('show'), 3000);
		}
	});
});

document.querySelectorAll('.filter-button').forEach((button) => {
	button.addEventListener('click', () => {
		document.querySelectorAll('.filter-button').forEach((item) => item.classList.remove('active'));
		button.classList.add('active');
	});
});

const playerProfiles = {
	jamie: { name: 'Jamie Carter', position: 'Goalkeeper', number: '01', image: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=900&q=85', history: 'A calm presence between the posts, Jamie came through the local youth setup before joining Baobab United. His quick distribution and steady voice give the team a confident first line of attack.' },
	musa: { name: 'Musa Okafor', position: 'Defender', number: '02', image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=85', history: 'Musa brings strength, timing, and a composed presence to the back line. He joined the club after making his mark in Sunday league football and quickly became a dependable organiser.' },
	elliot: { name: 'Elliot Hayes', position: 'Defender', number: '03', image: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=900&q=85', history: 'A versatile defender with an eye for a forward pass, Elliot has built his game around reading danger early and keeping the team moving up the pitch.' },
	daniel: { name: 'Daniel Mensah', position: 'Midfielder', number: '04', image: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=900&q=85', history: 'Daniel sets the rhythm in midfield. His energy, close control, and willingness to do the hard running make him an important link between defence and attack.' },
	owen: { name: 'Owen Williams', position: 'Midfielder', number: '05', image: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=900&q=85', history: 'Owen is a thoughtful passer who has grown through the club pathway. He sees space early and brings a patient, creative edge to the middle of the pitch.' },
	kofi: { name: 'Kofi Addo', position: 'Midfielder', number: '06', image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=900&q=85', history: 'Kofi combines sharp movement with a relentless work rate. His story at Baobab is one of steady progress, from training-ground prospect to first-team contributor.' },
	lucas: { name: 'Lucas Reed', position: 'Forward', number: '07', image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=85', history: 'Lucas plays on instinct and attacks every space behind a defence. After making a name for himself in local competition, he arrived ready to bring pace and purpose to the front line.' },
	andre: { name: 'Andre Silva', position: 'Forward', number: '08', image: 'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=900&q=85', history: 'Andre is a technically gifted forward with a knack for bringing others into the game. His positive attitude and creative finishing make him a constant threat.' }
};

const playerCards = document.querySelectorAll('.player-card');
	const playerDialog = document.querySelector('.player-dialog');
if (playerCards.length && playerDialog) {
	const profileImage = playerDialog.querySelector('.dialog-image');
	const profilePosition = playerDialog.querySelector('.profile-position');
	const profileName = playerDialog.querySelector('#dialog-player-name');
	const profileHistory = playerDialog.querySelector('.profile-history');
	const profileNumber = playerDialog.querySelector('.profile-meta strong');
	const closeDialog = () => playerDialog.close();
	playerCards.forEach((card) => {
		card.addEventListener('click', () => {
			const player = playerProfiles[card.dataset.player];
			if (!player) return;
			playerCards.forEach((item) => item.classList.toggle('active', item === card));
			profileImage.src = player.image;
			profileImage.alt = player.name;
			profilePosition.textContent = player.position;
			profileName.textContent = player.name;
			profileHistory.textContent = player.history;
			profileNumber.textContent = player.number;
			playerDialog.showModal();
		});
	});
	playerDialog.querySelector('.dialog-close').addEventListener('click', closeDialog);
	playerDialog.addEventListener('click', (event) => {
		if (event.target === playerDialog) closeDialog();
	});
}

const sections = document.querySelectorAll('main section[id]');
const sectionObserver = new IntersectionObserver((entries) => {
	entries.forEach((entry) => {
		if (entry.isIntersecting) {
			navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
		}
	});
}, { rootMargin: '-35% 0px -55% 0px' });

sections.forEach((section) => sectionObserver.observe(section));

function loadFaLeagueTable() {
	const leagueTable = document.querySelector('.league-table');
	if (!leagueTable || !window.location.protocol.startsWith('http')) return;

	const embed = document.createElement('div');
	embed.className = 'fa-league-embed';
	embed.innerHTML = '<div id="lrep1391014">Data loading.... <a href="https://fulltime.thefa.com/index.html?divisionseason=872585558" target="_blank" rel="noopener">View Macron Nottingham Division 1 South</a><br><br><a href="https://www.thefa.com/FULL-TIME" target="_blank" rel="noopener">FULL-TIME Home</a></div>';
	leagueTable.parentNode.insertBefore(embed, leagueTable);
	window.lrcode = '1391014';
	const script = document.createElement('script');
	script.src = 'https://fulltime.thefa.com/client/api/cs1.js';
	script.async = false;
	script.onload = () => {
		leagueTable.classList.add('fa-fallback-hidden');
		loadFaFixtures();
	};
	script.onerror = loadFaFixtures;
	embed.appendChild(script);
}

function loadFaFixtures() {
	const fixtureLayout = document.querySelector('.fixture-layout');
	if (!fixtureLayout || fixtureLayout.previousElementSibling?.classList.contains('fa-fixtures-embed')) return;

	const embed = document.createElement('div');
	embed.className = 'fa-fixtures-embed';
	embed.innerHTML = '<div id="lrep735098901">Data loading.... <a href="https://fulltime.thefa.com/index.html?divisionseason=872585558" target="_blank" rel="noopener">View Macron Stores Nottingham Division 1 South</a><br><br><a href="https://www.thefa.com/FULL-TIME" target="_blank" rel="noopener">FULL-TIME Home</a></div>';
	fixtureLayout.parentNode.insertBefore(embed, fixtureLayout);
	window.lrcode = '735098901';
	const script = document.createElement('script');
	script.src = 'https://fulltime.thefa.com/client/api/cs1.js';
	script.async = false;
	script.onload = () => fixtureLayout.classList.add('fa-fallback-hidden');
	embed.appendChild(script);
}

loadFaLeagueTable();

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
