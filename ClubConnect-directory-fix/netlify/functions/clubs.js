
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbx7iSl_QkYHxyD1a46zXg7mBsxduArwlmgsGcF6pa9_gVkKcQxQlElJkKcQxQlElJkQimolCFmJAzvg/exec';

export default async function handler() {
  try {
    const callback = 'clubconnect_cb_1234567890123';

    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('callback', callback);

    const response = await fetch(url.toString(), {
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(
        'Apps Script returned HTTP ' + response.status
      );
    }

    const text = (await response.text()).trim();

    // Expected response:
    // clubconnect_cb_1234567890123({"ok":true,"clubs":[...]});
    const prefix = callback + '(';

    if (!text.startsWith(prefix)) {
      throw new Error(
        'Unexpected Apps Script response: ' +
        text.slice(0, 150)
      );
    }

    const jsonText = text
      .slice(prefix.length)
      .replace(/\);\s*$/, '');

    const data = JSON.parse(jsonText);

    if (!data.ok || !Array.isArray(data.clubs)) {
      throw new Error(
        data.error || 'Club data unavailable'
      );
    }

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60'
        }
      }
    );

  } catch (error) {
    console.error('Club loading failed:', error);

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
