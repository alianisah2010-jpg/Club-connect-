# ClubConnect rebuild

A responsive, student-built club directory based on the original public ClubConnect homepage. Includes browsing, category filters, interest matching, school-email Supabase login, registration, optional featured request, and spreadsheet-controlled homepage featuring.

## Existing Google Sheet
https://docs.google.com/spreadsheets/d/1SCH5cggNn7HfH7JMfFsSVbE0kbrJ5pcsl4FKNwmUdTA/edit

The sheet already has these added columns:
- Club Database: S `Featured Requested`, T `Featured Status`
- HTML Form Responses: U `Featured Requested`, V `Featured Status`

## Setup
1. Open the existing Google Sheet > Extensions > Apps Script. Back up any existing Apps Script code first. Add `Code.gs` as a **new script file** (do not delete existing integrations). This code expects to be **bound to that spreadsheet**.
2. Apps Script > Project Settings > Script Properties: add `SUPABASE_URL` and `SUPABASE_ANON_KEY` (Supabase project's public anon/publishable key, not service role).
3. Deploy > New deployment > Web app. Execute as **Me**, access **Anyone**. Copy the `/exec` URL. This publishes verified club data and accepts submissions only with a valid Supabase user token whose email ends in `@overlake.org`. Anyone with the URL can read the approved directory data, as intended.
4. Edit `config.js`: set `supabaseUrl`, `supabaseAnonKey`, `appsScriptUrl` and `siteUrl`. The last value is the **new deployed website URL** including trailing `/`, never localhost. These are public browser settings; NEVER put a Supabase service-role key in config.js.
5. Host `index.html`, `styles.css`, `app.js`, and `config.js` together on a static HTTPS host such as Netlify, Cloudflare Pages, or GitHub Pages. Set the published URL in `config.js` and redeploy.
6. Supabase Dashboard > Authentication > URL Configuration: Site URL = the new published website URL; Redirect URLs includes that exact URL (or its callback URL if you later implement a dedicated callback). Under Authentication > Providers > Email, ensure email authentication is enabled. Request a **new** login email to test.
7. In the sheet, a new form submission arrives in `HTML Form Responses` with Featured Status `Pending` or `Not Requested`. Review it. Update the corresponding club's public details in `Club Database`, set `Verification Status` to `Verified` if it is approved for publication, and set `Featured Status` in **Club Database** to `Approved` only if you want it on the homepage. The homepage uses Club Database as the authoritative source. The HTML Form Responses status is a review record, not the live public source.

## Important security and limitations
- Form submissions are authenticated on the server by calling Supabase `/auth/v1/user`, not by trusting an email string from the browser.
- This browser-to-Apps-Script submission uses `no-cors`, so the browser cannot confirm whether Apps Script accepted it. Check the sheet to confirm. Apps Script can also return a 200 error message that the browser cannot read; do not interpret the browser request alone as success.
- The `doGet` JSONP endpoint is public by design and only includes clubs with `Verification Status = Verified`. Do not place private data in public club fields. The spreadsheet contains contact details that are deliberately not returned.
- No admin approval interface is exposed publicly; approve/reject inside Google Sheets.
- A registration does not automatically modify Club Database or publish a club. Admin review is required.
- Existing `Verification Status` values may need manual review; the site intentionally does not publish unverified entries.
- `@overlake.org` email suffix is checked, but domain ownership/affiliation must also be managed in Supabase; email domain alone is not a guarantee of current student status.
- This is a rebuild, not an editable ChatGPT Sites project. To change the new site, edit the files and redeploy.

## Testing checklist
- New login email opens the **new published site**, not localhost.
- Logging in updates the header to show the signed-in email.
- Unauthenticated club submission prompts sign-in.
- Authenticated submission creates a new row in HTML Form Responses; featured requests get `Pending`.
- A Verified club in Club Database appears in All Clubs.
- A Verified club with Featured Status `Approved` appears in Featured Clubs.
- Changing Featured Status to `Rejected` removes it from Featured Clubs after reload.
- Unverified clubs never appear publicly.
