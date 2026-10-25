
const cfg = window.CLUBCONNECT_CONFIG || {};

const categories = [
  'Academic',
  'Arts & Culture',
  'Community Service',
  'Sports & Fitness',
  'STEM',
  'Business',
  'Other'
];

const icons = {
  'Academic': '🎓',
  'Arts & Culture': '🎨',
  'Community Service': '💜',
  'Sports & Fitness': '⚽',
  'STEM': '🔬',
  'Business': '💼',
  'Other': '✨'
};

const $ = id => document.getElementById(id);

let clubs = [];
let client = null;
let session = null;

const configured = value =>
  typeof value === 'string' &&
  value.trim() !== '' &&
  !value.startsWith('REPLACE_') &&
  !value.includes('YOUR-NEW-');

// --------------------------------------
// SUPABASE LOGIN (UNCHANGED FOR NOW)
// --------------------------------------

if (
  configured(cfg.supabaseUrl) &&
  configured(cfg.supabaseAnonKey) &&
  window.supabase
) {
  client = window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseAnonKey,
    {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true
      }
    }
  );

  client.auth.getSession().then(({ data }) => {
    session = data.session;
    updateLogin();
  });

  client.auth.onAuthStateChange((_event, newSession) => {
    session = newSession;
    updateLogin();
  });
}

function updateLogin() {
  $('loginButton').textContent = session
    ? 'Signed in: ' + session.user.email
    : 'Log In / Sign Up';

  $('logoutButton').hidden = !session;
}

// --------------------------------------
// HTML SAFETY
// --------------------------------------

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character])
  );
}

// --------------------------------------
// CLUB CARDS
// --------------------------------------

function card(club) {
  return `
    <article class="club-card">
      <span class="pill">
        ${escapeHtml(club.category || 'Other')}
      </span>

      <h3>${escapeHtml(club.name)}</h3>

      <p>
        ${escapeHtml(club.description || 'Details coming soon.')}
      </p>

      <div class="details">
        ${club.days ? '<div>📅 ' + escapeHtml(club.days) + '</div>' : ''}
        ${club.time ? '<div>🕒 ' + escapeHtml(club.time) + '</div>' : ''}
        ${club.location ? '<div>📍 ' + escapeHtml(club.location) + '</div>' : ''}
        ${club.join ? '<div>How to join: ' + escapeHtml(club.join) + '</div>' : ''}
      </div>
    </article>
  `;
}

// --------------------------------------
// DISPLAY CLUBS
// --------------------------------------

function render() {
  const query = $('search').value.trim().toLowerCase();
  const category = $('categoryFilter').value;

  const filtered = clubs.filter(club => {
    const matchesCategory = !category || club.category === category;

    const searchableText = [
      club.name,
      club.description,
      club.days,
      club.location
    ].join(' ').toLowerCase();

    return matchesCategory && searchableText.includes(query);
  });

  $('clubCards').innerHTML = filtered.length
    ? filtered.map(card).join('')
    : '<div class="empty">No matching clubs yet.</div>';

  const featured = clubs.filter(
    club => club.featuredStatus === 'Approved'
  );

  $('featuredCards').innerHTML = featured.length
    ? featured.map(card).join('')
    : `<div class="empty">
         No featured clubs have been approved yet.
         Check back soon!
       </div>`;
}

// --------------------------------------
// LOAD APPROVED CLUBS FROM clubs.json
// --------------------------------------

async function loadClubs() {
  try {
    console.log('ClubConnect: Loading clubs.json...');

    const response = await fetch('/clubs.json', {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('clubs.json returned HTTP ' + response.status);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('clubs.json must contain an array of clubs.');
    }

    clubs = data;
    console.log('ClubConnect loaded', clubs.length, 'clubs');
    render();
  } catch (error) {
    console.error('ClubConnect loading error:', error);
    showLoadError(error.message);
  }
}

// --------------------------------------
// LOADING ERROR
// --------------------------------------

function showLoadError(reason) {
  const safe = escapeHtml(reason || 'Unknown connection error');

  $('clubCards').innerHTML =
    '<div class="empty">Could not load clubs. ' + safe + '</div>';

  $('featuredCards').innerHTML =
    '<div class="empty">Could not load featured clubs.</div>';
}

// --------------------------------------
// SUPABASE EMAIL LOGIN (UNCHANGED)
// --------------------------------------

async function login(event) {
  event.preventDefault();

  const email = $('email').value.trim().toLowerCase();

  if (!email.endsWith('@overlake.org')) {
    $('loginMessage').textContent =
      'Please use an @overlake.org school email.';
    return;
  }

  if (!client) {
    $('loginMessage').textContent = 'Supabase is not configured yet.';
    return;
  }

  const redirect = cfg.siteUrl;

  if (!configured(redirect) || redirect.includes('localhost')) {
    $('loginMessage').textContent =
      'Set your published siteUrl in config.js first.';
    return;
  }

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirect,
      shouldCreateUser: true
    }
  });

  $('loginMessage').textContent = error
    ? error.message
    : 'Check your email for a sign-in link. Open the newest email.';
}

// --------------------------------------
// CLUB REGISTRATION (TO BE UPDATED IN STEP 3)
// --------------------------------------

async function submitClub(event) {
  event.preventDefault();

  const message = $('formMessage');

  // Registration will be connected to Netlify Forms in Step 3.
  // Do not send submissions to the old Google Apps Script endpoint.
  message.textContent =
    'Club submissions are being updated. Please check back soon.';
}

// --------------------------------------
// INITIALIZE WEBSITE
// --------------------------------------

function init() {
  for (const category of categories) {
    $('categoryCards').insertAdjacentHTML(
      'beforeend',
      `
      <button
        class="category-card"
        data-category="${escapeHtml(category)}"
      >
        <span>${icons[category]}</span>
        ${escapeHtml(category)}
      </button>
      `
    );

    for (const id of ['categoryFilter', 'interest', 'formCategory']) {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      $(id).append(option);
    }
  }

  document.querySelectorAll('.category-card').forEach(button => {
    button.addEventListener('click', () => {
      $('categoryFilter').value = button.dataset.category;
      location.hash = 'clubs';
      render();
    });
  });

  $('search').addEventListener('input', render);
  $('categoryFilter').addEventListener('change', render);

  $('findMatches').addEventListener('click', () => {
    const category = $('interest').value;

    if (!category) {
      $('quizResult').textContent = 'Choose an interest first.';
      return;
    }

    $('categoryFilter').value = category;
    render();
    $('quizResult').textContent = `Showing clubs in ${category}.`;
    location.hash = 'clubs';
  });

  $('loginButton').onclick = () => {
    $('loginDialog').showModal();
  };

  $('logoutButton').onclick = async () => {
    await client?.auth.signOut();
    $('loginDialog').close();
  };

  $('loginForm').onsubmit = login;
  $('clubForm').onsubmit = submitClub;

  loadClubs();
}

init();
