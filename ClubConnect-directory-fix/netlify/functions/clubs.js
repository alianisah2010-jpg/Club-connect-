
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbx7iSl_QkYHxyD1a46zXg7mBsxduArwlmgsGcF6pa9_gVkKcQxQlElJkKcQxQlElJkQimolCFmJAzvg/exec';

export default async function handler() {
  try {
    const callback = 'clubconnect_cb_1234567890123';

    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('callback', callback);

    // Inspect the first response without automatically
    // following Google's redirect.
    const first = await fetch(url.toString(), {
      redirect: 'manual'
    });

    console.log('Initial status:', first.status);
    console.log(
      'Initial redirect destination:',
      first.headers.get('location')
    );

    let response = first;

    if (first.status >= 300 && first.status < 400) {
      const location = first.headers.get('location');

      if (!location) {
        throw new Error('Google redirect has no location');
      }

      response = await fetch(location, {
        redirect: 'follow'
      });

      console.log('Final status:', response.status);
    }

    if (!response.ok) {
      throw new Error(
        'Google returned HTTP ' + response.status
      );
    }

    const text = (await response.text()).trim();

    const prefix = callback + '(';

    if (!text.startsWith(prefix)) {
      throw new Error(
        'Unexpected response: ' + text.slice(0, 100)
      );
    }

    const jsonText = text
      .slice(prefix.length)
      .replace(/\);\s*$/, '');

    const data = JSON.parse(jsonText);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('ClubConnect diagnostic error:', error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
