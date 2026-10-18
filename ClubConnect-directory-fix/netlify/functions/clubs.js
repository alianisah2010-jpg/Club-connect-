
async function loadClubs() {
  try {
    const response = await fetch(
      '/.netlify/functions/clubs'
    );

    if (!response.ok) {
      throw new Error(
        'Club service returned HTTP ' + response.status
      );
    }

    const data = await response.json();

    if (!data.ok || !Array.isArray(data.clubs)) {
      throw new Error('Invalid club data');
    }

    clubs = data.clubs;
    render();

    console.log(
      'ClubConnect loaded',
      clubs.length,
      'clubs'
    );

  } catch (error) {
    console.error('ClubConnect:', error);
    showLoadError(error.message);
  }
}
