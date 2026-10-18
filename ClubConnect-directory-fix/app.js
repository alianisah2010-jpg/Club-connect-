
const cfg = window.CLUBCONNECT_CONFIG;

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
// SUPABASE LOGIN
// --------------------------------------

if (
  cfg &&
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
        ${escapeHtml(
          club.description || 'Details coming soon.'
        )}
      </p>

      <div class="details">
        ${
          club.days
            ? '<div>📅 ' + escapeHtml(club.days) + '</div>'
            : ''
        }

        ${
          club.time
            ? '<div>🕒 ' + escapeHtml(club.time) + '</div>'
            : ''
        }

        ${
          club.location
            ? '<div>📍 ' + escapeHtml(club.location) + '</div>'
            : ''
        }

        ${
          club.join
            ? '<div>How to join: ' +
              escapeHtml(club.join) +
              '</div>'
            : ''
        }
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
    const matchesCategory =
      !category || club.category === category;

    const searchableText = [
      club.name,
      club.description,
      club.days,
      club.location
    ].join(' ').toLowerCase();

    return (
      matchesCategory &&
      searchableText.includes(query)
    );
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
// LOAD CLUBS DIRECTLY FROM GOOGLE
// --------------------------------------

function loadClubs() {
  console.log('ClubConnect: Loading clubs...');

  if (!cfg || !configured(cfg.appsScriptUrl)) {
    showLoadError(
      'Google Apps Script URL is not configured.'
    );
    return;
  }

  // Apps Script accepts callbacks beginning with
  // clubconnect_cb_ followed by 10-20 digits.
  const callbackName =
    'clubconnect_cb_' +
    Date.now() +
    Math.floor(Math.random() * 1000000);

  const script = document.createElement('script');

  let finished = false;

  const timeout = setTimeout(() => {
    fail('Google Apps Script did not respond in time.');
  }, 15000);

  function cleanup() {
    clearTimeout(timeout);
    script.remove();
    delete window[callbackName];
  }

  function fail(message) {
    if (finished) return;

    finished = true;
    cleanup();

    console.error(
      'ClubConnect loading error:',
      message
    );

    showLoadError(message);
  }

  // Google Apps Script calls this function
  // when the club data is ready.
  window[callbackName] = function(data) {
    if (finished) return;

    finished = true;
    cleanup();

    if (
      !data ||
      !data.ok ||
      !Array.isArray(data.clubs)
    ) {
      showLoadError(
        data?.error || 'Invalid club data received.'
      );
      return;
    }

    clubs = data.clubs;

    console.log(
      'ClubConnect successfully loaded',
      clubs.length,
      'clubs'
    );

    render();
  };

  script.onerror = () => {
    fail('Could not load Google Apps Script.');
  };

  try {
    const url = new URL(cfg.appsScriptUrl);

    url.searchParams.set(
      'callback',
      callbackName
    );

    script.src = url.toString();

    document.head.appendChild(script);

  } catch (error) {
    fail(error.message);
  }
}

// --------------------------------------
// LOADING ERROR
// --------------------------------------

function showLoadError(reason) {
  const safe = escapeHtml(
    reason || 'Unknown connection error'
  );

  $('clubCards').innerHTML =
    '<div class="empty">Could not load clubs. ' +
    safe +
    '</div>';

  $('featuredCards').innerHTML =
    '<div class="empty">Could not load featured clubs.</div>';
}

// --------------------------------------
// SUPABASE EMAIL LOGIN
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
    $('loginMessage').textContent =
      'Supabase is not configured yet.';
    return;
  }

  const redirect = cfg.siteUrl;

  if (
    !configured(redirect) ||
    redirect.includes('localhost')
  ) {
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
// CLUB REGISTRATION
// --------------------------------------

async function submitClub(event) {
  event.preventDefault();

  const message = $('formMessage');

  if (!session) {
    message.textContent =
      'Please sign in with your Overlake email first.';

    $('loginDialog').showModal();
    return;
  }

  if (!cfg || !configured(cfg.appsScriptUrl)) {
    message.textContent =
      'Google Sheets connection is not configured yet.';
    return;
  }

  const formData = new FormData(event.target);

  const fields = {
    clubName: formData.get('clubName'),
    description: formData.get('description'),
    category: formData.get('category'),
    meetingDays: formData.get('meetingDays'),
    meetingTime: formData.get('meetingTime'),
    meetingLocation: formData.get('meetingLocation'),
    howToJoin: formData.get('howToJoin'),
    featuredRequested:
      formData.has('featuredRequested')
        ? 'Yes'
        : 'No'
  };

  if (
    !fields.clubName ||
    !fields.description ||
    !fields.category
  ) {
    message.textContent =
      'Complete all required fields.';
    return;
  }

  message.textContent = 'Submitting...';

  try {
    const token = session.access_token;

    const body = new URLSearchParams({
      ...fields,
      accessToken: token
    });

    await fetch(cfg.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded'
      },
      body
    });

    message.textContent =
      'Submission sent. Please verify that it appears ' +
      'in the HTML Form Responses tab.';

    event.target.reset();

  } catch (error) {
    message.textContent =
      'Could not send submission: ' +
      error.message;
  }
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

    for (const id of [
      'categoryFilter',
      'interest',
      'formCategory'
    ]) {
      const option = document.createElement('option');

      option.value = category;
      option.textContent = category;

      $(id).append(option);
    }
  }

  document
    .querySelectorAll('.category-card')
    .forEach(button => {
      button.addEventListener('click', () => {
        $('categoryFilter').value =
          button.dataset.category;

        location.hash = 'clubs';
        render();
      });
    });

  $('search').addEventListener('input', render);

  $('categoryFilter').addEventListener(
    'change',
    render
  );

  $('findMatches').addEventListener('click', () => {
    const category = $('interest').value;

    if (!category) {
      $('quizResult').textContent =
        'Choose an interest first.';
      return;
    }

    $('categoryFilter').value = category;

    render();

    $('quizResult').textContent =
      `Showing clubs in ${category}.`;

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

  // Load public clubs without requiring Supabase.
  loadClubs();
}

init();
