/* ============================================================
   Cable & Cellar — Cloudflare Worker: Form Handler
   ============================================================

   SETUP (one-time, ~10 minutes):

   1. Sign up at resend.com (free)
   2. Go to Domains → Add Domain → add cableandcellar.com
      Add the 3 DNS records they show you (takes ~5 min to verify)
   3. Go to API Keys → Create API Key → copy the key
   4. Sign up at cloudflare.com (free)
   5. Go to Workers & Pages → Create Worker → paste this file
   6. In the Worker settings → Variables → add:
        RESEND_API_KEY = re_xxxxxxxxxxxx  (your Resend key, mark as Secret)
   7. Copy your Worker URL (e.g. https://cable-cellar-form.yourname.workers.dev)
   8. Paste that URL into js/main.js where it says WORKER_URL below
   ============================================================ */

const OWNER_EMAIL  = 'hello@cableandcellar.com';
const FROM_ADDRESS = 'Cable & Cellar <hello@cableandcellar.com>';

export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405);
    }

    // Parse form data
    let name, email, phone, message;
    try {
      const data = await request.formData();
      name    = (data.get('name')    || '').trim();
      email   = (data.get('email')   || '').trim();
      phone   = (data.get('phone')   || '').trim();
      message = (data.get('message') || '').trim();
      if (!name || !email) throw new Error('Name and email are required.');
    } catch (e) {
      return corsResponse(JSON.stringify({ error: e.message }), 400);
    }

    // Send both emails in parallel
    try {
      await Promise.all([
        sendEmail(env.RESEND_API_KEY, {
          from:     FROM_ADDRESS,
          to:       [email],
          reply_to: OWNER_EMAIL,
          subject:  "We've received your inquiry — Cable & Cellar",
          html:     clientEmailHtml(name),
        }),
        sendEmail(env.RESEND_API_KEY, {
          from:     FROM_ADDRESS,
          to:       [OWNER_EMAIL],
          reply_to: email,
          subject:  `New Consultation Request — ${name}`,
          html:     ownerEmailHtml({ name, email, phone, message }),
        }),
      ]);
      return corsResponse(JSON.stringify({ success: true }), 200);
    } catch (e) {
      console.error(e);
      return corsResponse(JSON.stringify({ error: 'Email send failed.' }), 500);
    }
  }
};

// ---- Resend API call -----------------------------------------------

async function sendEmail(apiKey, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Resend ${r.status}: ${text}`);
  }
  return r.json();
}

function corsResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type',
    },
  });
}

// ---- Client confirmation email ------------------------------------

function clientEmailHtml(name) {
  const greeting = name ? `, ${name}` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#1A1815;">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background-color:#1A1815;padding:56px 24px 64px;">
  <tr><td align="center">
  <table width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0" border="0">

    <!-- ── Logo ── -->
    <tr>
      <td style="padding-bottom:40px;border-bottom:1px solid rgba(255,255,255,0.07);">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border:1px solid #C4A265;
                       padding:5px 10px;
                       font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:10px;font-weight:500;
                       letter-spacing:0.18em;color:#C4A265;">C&amp;C</td>
            <td style="padding-left:14px;
                       font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:13px;font-weight:300;
                       letter-spacing:0.07em;color:#FAFAF8;">Cable &amp; Cellar</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── Eyebrow + Heading ── -->
    <tr>
      <td style="padding:48px 0 0;">
        <p style="margin:0 0 20px;
                  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                  font-size:9px;font-weight:400;
                  letter-spacing:0.26em;text-transform:uppercase;
                  color:#C4A265;">Consultation Request</p>
        <h1 style="margin:0 0 28px;
                   font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                   font-size:38px;font-weight:200;
                   letter-spacing:-0.03em;line-height:1.1;
                   color:#FAFAF8;">We've received<br>your inquiry.</h1>
        <p style="margin:0;
                  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                  font-size:15px;font-weight:300;
                  color:rgba(255,255,255,0.52);line-height:1.85;">
          Thank you for reaching out${greeting}. We'll review your
          project details and be in touch within
          <span style="color:#C4A265;font-weight:400;">48 hours</span>.
        </p>
      </td>
    </tr>

    <!-- ── Spacer ── -->
    <tr><td style="height:48px;font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- ── Divider ── -->
    <tr><td style="height:1px;background:rgba(255,255,255,0.07);font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- ── In the meantime ── -->
    <tr>
      <td style="padding:36px 0 48px;">
        <p style="margin:0 0 10px;
                  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                  font-size:9px;letter-spacing:0.2em;text-transform:uppercase;
                  color:rgba(255,255,255,0.28);">In the meantime</p>
        <p style="margin:0;
                  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                  font-size:14px;font-weight:300;
                  color:rgba(255,255,255,0.48);line-height:1.85;">
          Feel free to call us directly at
          <a href="tel:+14088774537"
             style="color:#C4A265;text-decoration:none;">+1&nbsp;(408)&nbsp;877&#8209;4537</a>.
        </p>
      </td>
    </tr>

    <!-- ── Divider ── -->
    <tr><td style="height:1px;background:rgba(255,255,255,0.07);font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- ── Footer ── -->
    <tr>
      <td style="padding-top:32px;">
        <p style="margin:0;
                  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                  font-size:10px;font-weight:300;
                  color:rgba(255,255,255,0.18);line-height:1.7;">
          Cable &amp; Cellar &nbsp;&middot;&nbsp;
          Architectural floating wine galleries &nbsp;&middot;&nbsp;
          Bay Area, California
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>

</body>
</html>`;
}

// ---- Owner notification email -------------------------------------

function ownerEmailHtml({ name, email, phone, message }) {
  const firstName = name.split(' ')[0];
  const phoneClean = phone.replace(/\D/g, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#1A1815;">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background-color:#1A1815;padding:56px 24px 64px;">
  <tr><td align="center">
  <table width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0" border="0">

    <!-- ── Logo ── -->
    <tr>
      <td style="padding-bottom:40px;border-bottom:1px solid rgba(255,255,255,0.07);">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border:1px solid #C4A265;
                       padding:5px 10px;
                       font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:10px;font-weight:500;
                       letter-spacing:0.18em;color:#C4A265;">C&amp;C</td>
            <td style="padding-left:14px;
                       font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:13px;font-weight:300;
                       letter-spacing:0.07em;color:#FAFAF8;">Cable &amp; Cellar</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── Heading ── -->
    <tr>
      <td style="padding:44px 0 32px;">
        <p style="margin:0 0 18px;
                  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                  font-size:9px;letter-spacing:0.26em;text-transform:uppercase;
                  color:#C4A265;">New Inquiry</p>
        <h1 style="margin:0;
                   font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                   font-size:30px;font-weight:200;
                   letter-spacing:-0.025em;line-height:1.2;
                   color:#FAFAF8;">Consultation Request</h1>
      </td>
    </tr>

    <!-- ── Details card ── -->
    <tr>
      <td style="background:rgba(255,255,255,0.04);
                 border:1px solid rgba(255,255,255,0.07);
                 padding:28px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">

          <!-- Name -->
          <tr>
            <td style="width:72px;padding-bottom:18px;vertical-align:top;padding-top:2px;
                       font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:9px;letter-spacing:0.2em;text-transform:uppercase;
                       color:rgba(255,255,255,0.28);">Name</td>
            <td style="padding-bottom:18px;
                       font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:14px;font-weight:300;
                       color:rgba(255,255,255,0.82);">${name}</td>
          </tr>

          <!-- Email -->
          <tr>
            <td style="padding-bottom:18px;vertical-align:top;padding-top:2px;
                       font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:9px;letter-spacing:0.2em;text-transform:uppercase;
                       color:rgba(255,255,255,0.28);">Email</td>
            <td style="padding-bottom:18px;
                       font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:14px;">
              <a href="mailto:${email}" style="color:#C4A265;text-decoration:none;">${email}</a>
            </td>
          </tr>

          ${phone ? `<!-- Phone -->
          <tr>
            <td style="padding-bottom:18px;vertical-align:top;padding-top:2px;
                       font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:9px;letter-spacing:0.2em;text-transform:uppercase;
                       color:rgba(255,255,255,0.28);">Phone</td>
            <td style="padding-bottom:18px;
                       font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:14px;">
              <a href="tel:${phoneClean}" style="color:#C4A265;text-decoration:none;">${phone}</a>
            </td>
          </tr>` : ''}

          ${message ? `<!-- Message -->
          <tr>
            <td style="vertical-align:top;padding-top:2px;
                       font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:9px;letter-spacing:0.2em;text-transform:uppercase;
                       color:rgba(255,255,255,0.28);">Message</td>
            <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:14px;font-weight:300;
                       color:rgba(255,255,255,0.65);line-height:1.8;">
              ${message.replace(/\n/g, '<br>')}
            </td>
          </tr>` : ''}

        </table>
      </td>
    </tr>

    <!-- ── Action buttons ── -->
    <tr>
      <td style="padding-top:28px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:#C4A265;padding:0;">
              <a href="mailto:${email}"
                 style="display:block;padding:13px 28px;
                        font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                        font-size:12px;font-weight:400;letter-spacing:0.06em;
                        color:#FFFFFF;text-decoration:none;">Reply to ${firstName}</a>
            </td>
            ${phone ? `<td style="padding-left:20px;">
              <a href="tel:${phoneClean}"
                 style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                        font-size:13px;font-weight:300;
                        color:rgba(255,255,255,0.45);text-decoration:none;">${phone}</a>
            </td>` : ''}
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── Spacer ── -->
    <tr><td style="height:48px;font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- ── Divider ── -->
    <tr><td style="height:1px;background:rgba(255,255,255,0.07);font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- ── Footer ── -->
    <tr>
      <td style="padding-top:32px;">
        <p style="margin:0;
                  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                  font-size:10px;font-weight:300;
                  color:rgba(255,255,255,0.18);line-height:1.7;">
          Cable &amp; Cellar &nbsp;&middot;&nbsp;
          Architectural floating wine galleries &nbsp;&middot;&nbsp;
          Bay Area, California
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>

</body>
</html>`;
}
