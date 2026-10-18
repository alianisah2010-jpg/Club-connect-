
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbx7iSl_QkYHxyD1a46zXg7mBsxduArwlmgsGcF6pa9_gVkKcQxQlElJkKcQxQlElJkQimolCFmJAzvg/exec';

exports.handler = async function () {
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

    // Google Apps Script returns JSONP:
    // clubconnect_cb_1234567890123({...});
    const pattern = new RegExp(
      '^' + callback.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '\\(([\\s\\S]*)\\);?$'
    );

    const match = text.match(pattern);

    if (!match) {
      throw new Error(
        'Unexpected Apps Script response: ' +
        text.slice(0, 150)
      );
    }

    const data = JSON.parse(match[1]);

    if (!data.ok || !Array.isArray(data.clubs)) {
      throw new Error(
        data.error || 'Club data unavailable'
      );
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Club loading failed:', error);

    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ok: false,
        error: error.message
      })
    };
  }
};
