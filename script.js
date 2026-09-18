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
	'ltyb-ahmed': { name: 'ltyb Ahmed', position: 'Defender', number: '01', image: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=900&q=85', history: 'A composed defender who stays calm in the moments when the team needs control. His work rate and decision-making help keep the back line organised.' },
	'tyga-aikins': { name: 'Tyga Aikins', position: 'Midfielder', number: '02', image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=85', history: 'Tyga adds energy and creativity to the centre of the park. He keeps the ball moving and is always ready to support the press and break forward.' },
	'mamadou-alpha-barry': { name: 'Mamadou Alpha Barry', position: 'Defender', number: '03', image: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=900&q=85', history: 'Mamadou brings strength and composure to the defensive line. His ability to read play and recover possession adds consistency to the team structure.' },
	'gabriel-banks': { name: 'Gabriel Banks', position: 'Midfielder', number: '04', image: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=900&q=85', history: 'Gabriel is all about tempo and possession. He links moves between defence and attack and provides a calm presence in transition.' },
	'adams-bwala': { name: 'Adams Bwala', position: 'Forward', number: '05', image: 'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=900&q=85', history: 'Adams attacks with direct intent and sharp movement in the final third. His pace and instinct make him a difficult match-up for defenders.' },
	'abdoulie-ceesay': { name: 'Abdoulie Ceesay', position: 'Forward', number: '06', image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=900&q=85', history: 'Abdoulie thrives in the spaces behind defences and brings attacking purpose to every phase of play. His confidence and creativity keep opponents alert.' },
	'sulayman-cham': { name: 'Sulayman Cham', position: 'Coach', number: '07', image: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=900&q=85', history: 'Sulayman leads the group with clarity, energy, and a strong focus on building a disciplined, ambitious team identity. His coaching brings structure and belief.' },
	'abdulhadi-omar-dafaallah': { name: 'Abdulhadi Omar Dafaallah', position: 'Forward', number: '08', image: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=900&q=85', history: 'Abdulhadi is a direct attacking threat who likes to challenge defenders with pace and relentless movement. He adds a strong presence in the front line.' },
	'uchechukwu-ekere': { name: 'Uchechukwu Ekere', position: 'Forward', number: '09', image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=85', history: 'Uchechukwu brings a fearless approach to attack and a willingness to run beyond the back line. He plays with ambition and confidence.' },
	'marcus-holder': { name: 'Marcus Holder', position: 'Midfielder', number: '10', image: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=900&q=85', history: 'Marcus is a hardworking midfield option with the ability to influence both phases. He supports the press and adds balance across the pitch.' },
	'rehan-imran': { name: 'Rehan Imran', position: 'Midfielder', number: '11', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=85', history: 'Rehan gives the team technical calm and vision in possession. He looks to connect play and drive the tempo with smart movement.' },
	'chernor-jalloh': { name: 'Chernor Jalloh', position: 'Goalkeeper', number: '12', image: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=85', history: 'Chernor is a sharp, confident goalkeeper who commands his area and keeps the team organised. His distribution helps start attacks from the back.' },
	'christian-michael-pope-jordan': { name: 'Christian Michael Pope Jordan', position: 'Forward', number: '13', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85', history: 'Christian brings unpredictability and attacking intent. He is always looking to work space, carry the ball, and create chances for the forward line.' },
	'alkali-jouma': { name: 'Alkali Jouma', position: 'Defender', number: '14', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85', history: 'Alkali offers aggression, resilience, and a strong understanding of defensive shape. He is a dependable option in key moments and duels.' },
	'hassan-kamara': { name: 'Hassan Kamara', position: 'Midfielder', number: '15', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85', history: 'Hassan combines energy with a willingness to do the team’s dirty work. He provides the midfield bite and support needed to control games.' },
	'albashir-kuri': { name: 'Albashir Kuri', position: 'Midfielder', number: '16', image: 'https://images.unsplash.com/photo-1521417531038-928d2d4d6aa8?auto=format&fit=crop&w=900&q=85', history: 'Albashir is a mobile midfielder who can influence the centre of the pitch with both work rate and passing quality. He keeps the team balanced.' },
	'abderrahman-musa': { name: 'Abderrahman Musa', position: 'Defender', number: '17', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85', history: 'Abderrahman gives the back line a strong defensive foundation and the courage to play out from the back. His presence is a steady influence.' },
	'jordan-oconnell-thomas': { name: 'Jordan O\'Connell-Thomas', position: 'Manager', number: '18', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85', history: 'Jordan brings leadership, direction, and a clear tactical identity to the club. He helps shape the culture and drive the group forward.' },
	'abraham-owolabi': { name: 'Abraham Owolabi', position: 'Defender', number: '19', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85', history: 'Abraham adds defensive resolve and a strong sense of responsibility in the unit. He plays with bravery and keeps the structure secure.' },
	'balung-yiey-riak': { name: 'Balung Yiey Riak', position: 'Midfielder', number: '20', image: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=85', history: 'Balung gives the side energy and continuity in midfield. He is a reliable presence who supports both the ball-winning and creative phases.' },
	'mohanad-salah': { name: 'Mohanad Salah', position: 'Midfielder', number: '21', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85', history: 'Mohanad brings quality on the ball and a willingness to find the right pass. His calm nature helps the team keep control in the middle.' },
	'morad-shweikh': { name: 'Morad Shweikh', position: 'Forward', number: '22', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85', history: 'Morad is a lively, direct forward who brings penetration and poise in front of goal. He is always looking to create moments that change games.' },
	'saburideen-babatunde-sokanla': { name: 'Saburideen Babatunde Sokanla', position: 'Forward', number: '23', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85', history: 'Saburideen plays with confidence and aggression in the final third. He is a natural outlet who can stretch the back line and finish chances.' },
	'omar-timimi': { name: 'Omar Timimi', position: 'Midfielder', number: '24', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85', history: 'Omar gives the side a creative spark and a patient passing range. He is effective at threading moves together and getting the team moving.' },
	'anthony-udegbu': { name: 'Anthony Udegbu', position: 'Defender', number: '25', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85', history: 'Anthony combines physicality with a clear understanding of the game. He’s a steady defensive option who protects the team when the pressure increases.' },
	'seky-udo': { name: 'Seky Udo', position: 'Defender', number: '26', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=85', history: 'Seky brings calm and reliability to the defensive unit. He reads the game well and helps the team stay compact and organised.' }
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
