
// ======================================
// CLUBCONNECT - MAIN APPLICATION
// Netlify Forms + GitHub clubs.json
// ======================================

// --------------------------------------
// CATEGORIES
// --------------------------------------

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

      <h3>
        ${escapeHtml(club.name)}
      </h3>

      <p>
        ${escapeHtml(
          club.description || 'Details coming soon.'
        )}
      </p>

      <div class="details">

        ${
          club.days
            ? '<div>📅 ' +
              escapeHtml(club.days) +
              '</div>'
            : ''
        }

        ${
          club.time
            ? '<div>🕒 ' +
              escapeHtml(club.time) +
              '</div>'
            : ''
        }

        ${
          club.location
            ? '<div>📍 ' +
              escapeHtml(club.location) +
              '</div>'
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
  const query = $('search').value
    .trim()
    .toLowerCase();

  const category = $('categoryFilter').value;

  const filtered = clubs.filter(club => {
    const matchesCategory =
      !category || club.category === category;

    const searchableText = [
      club.name,
      club.description,
      club.days,
      club.time,
      club.location,
      club.join
    ]
      .join(' ')
      .toLowerCase();

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
    : `
      <div class="empty">
        No featured clubs have been approved yet.
        Check back soon!
      </div>
    `;
}

// --------------------------------------
// LOAD CLUBS FROM clubs.json
// --------------------------------------

async function loadClubs() {
  try {
    console.log(
      'ClubConnect: Loading approved clubs...'
    );

    const response = await fetch('/clubs.json', {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        'clubs.json returned HTTP ' +
        response.status
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        'clubs.json must contain an array.'
      );
    }

    clubs = data;

    console.log(
      'ClubConnect successfully loaded',
      clubs.length,
      'clubs'
    );

    render();

  } catch (error) {
    console.error(
      'ClubConnect loading error:',
      error
    );

    showLoadError(error.message);
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
    '<div class="empty">' +
    'Could not load clubs. ' +
    safe +
    '</div>';

  $('featuredCards').innerHTML =
    '<div class="empty">' +
    'Could not load featured clubs.' +
    '</div>';
}

// --------------------------------------
// NETLIFY FORMS - CLUB REGISTRATION
// --------------------------------------

async function submitClub(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const message = $('formMessage');

  const submitButton = form.querySelector(
    'button[type="submit"]'
  );

  // Check browser form validation.
  if (!form.reportValidity()) {
    return;
  }

  const formData = new FormData(form);

  // Make sure Netlify identifies the form.
  formData.set(
    'form-name',
    'club-registration'
  );

  const email = String(
    formData.get('studentEmail') || ''
  )
    .trim()
    .toLowerCase();

  // Require an Overlake email address.
  if (!/^[^\s@]+@overlake\.org$/i.test(email)) {
    message.textContent =
      'Please enter a valid @overlake.org email address.';
    return;
  }

  formData.set('studentEmail', email);

  // The checkbox is optional.
  formData.set(
    'featuredRequested',
    formData.has('featuredRequested')
      ? 'Yes'
      : 'No'
  );

  message.textContent = 'Submitting your club...';

  if (submitButton) {
    submitButton.disabled = true;
  }

  try {
    const body = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      body.append(key, String(value));
    }

    const response = await fetch('/', {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      throw new Error(
        'Netlify returned HTTP ' +
        response.status
      );
    }

    message.textContent =
      'Your club was submitted successfully! ' +
      'It will appear on ClubConnect after ' +
      'an administrator reviews and approves it.';

    form.reset();

  } catch (error) {
    console.error(
      'ClubConnect submission error:',
      error
    );

    message.textContent =
      'Your submission could not be sent. ' +
      'Please try again. ' +
      error.message;

  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

// --------------------------------------
// INITIALIZE WEBSITE
// --------------------------------------

function init() {

  // Build category cards and dropdowns.
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
      const option = document.createElement(
        'option'
      );

      option.value = category;
      option.textContent = category;

      $(id).append(option);
    }
  }

  // Category cards.
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

  // Search.
  $('search').addEventListener(
    'input',
    render
  );

  // Category filter.
  $('categoryFilter').addEventListener(
    'change',
    render
  );

  // Find My Club quiz.
  $('findMatches').addEventListener(
    'click',
    () => {

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
    }
  );

  // Netlify club registration.
  $('clubForm').addEventListener(
    'submit',
    submitClub
  );

  // Load approved clubs.
  loadClubs();
}

// --------------------------------------
// START CLUBCONNECT
// --------------------------------------

init();
