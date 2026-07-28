/**
 * ============================================================
 * Gateway To Future — Counselling Booking Handler
 * Google Apps Script (GAS) Web App
 * ============================================================
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com → New Project
 * 2. Paste this entire file as Code.gs
 * 3. Replace the config values below with yours
 * 4. Click Deploy → New deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL
 * 6. Paste it into index.html as APPS_SCRIPT_WEBHOOK value
 *
 * ============================================================
 */

// ─── YOUR CONFIGURATION ─────────────────────────────────────────────────────
const CONFIG = {
  // Your Gmail address where booking notifications go
  NOTIFY_EMAIL: 'your.gmail@gmail.com',   // ← CHANGE THIS

  // Your Notion Integration Token
  // Get it from: https://www.notion.so/my-integrations → Create integration
  NOTION_TOKEN: 'secret_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',   // ← CHANGE THIS

  // Your Notion Database ID (the CRM database where leads are stored)
  // Copy it from the database URL: notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...
  NOTION_DATABASE_ID: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',   // ← CHANGE THIS
};
// ────────────────────────────────────────────────────────────────────────────


/**
 * Handle POST requests from the website form
 */
function doPost(e) {
  try {
    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (err) {
      payload = e.parameter;
    }

    const type = payload.type || 'unknown';

    if (type === 'counseling_booking') {
      handleCounselingBooking(payload);
    } else if (type === 'payment_confirmed') {
      handlePaymentConfirmed(payload);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Also handle GET (for testing in browser)
 */
function doGet(e) {
  return ContentService
    .createTextOutput('GTF Webhook is live ✅')
    .setMimeType(ContentService.MimeType.TEXT);
}


// ─── BOOKING HANDLER ─────────────────────────────────────────────────────────

function handleCounselingBooking(data) {
  const { name, email, phone, date, notes, amount, timestamp } = data;

  // 1️⃣ Send Gmail notification to you
  const subject = `📅 New Counselling Booking — ${name} (${date})`;
  const body = `
New counselling booking received on Gateway To Future!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Student Name   : ${name}
📧 Email          : ${email}
📱 WhatsApp       : ${phone}
📅 Preferred Date : ${date}
💰 Amount         : ${amount || '₹1,000'}
⏱  Submitted At   : ${new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Student Notes:
${notes}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reply to confirm their slot at 9:00 PM IST on ${date}.
  `;

  GmailApp.sendEmail(CONFIG.NOTIFY_EMAIL, subject, body, {
    replyTo: email,
    name: 'GTF Booking System'
  });

  // 2️⃣ Create/update Notion entry
  createNotionLead({
    name,
    email,
    phone,
    date,
    notes,
    amount: amount || '₹1,000',
    status: 'New',
    type: 'Counselling Booking'
  });
}


// ─── PAYMENT CONFIRMED HANDLER ────────────────────────────────────────────────

function handlePaymentConfirmed(data) {
  const { name, email, phone, date, notes, method, amount, timestamp } = data;

  // 1️⃣ Send payment confirmation Gmail to yourself
  const subject = `✅ PAYMENT CONFIRMED — ${name} paid ${amount || '₹1,000'} via ${method}`;
  const body = `
A student has marked their counselling payment as DONE!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Name           : ${name}
📧 Email          : ${email}
📱 WhatsApp       : ${phone}
📅 Session Date   : ${date}
💰 Amount Paid    : ${amount || '₹1,000'}
💳 Payment Method : ${method}
⏱  Confirmed At   : ${new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Notes:
${notes}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ ACTION NEEDED: Check receipt on WhatsApp & confirm their slot!
  `;

  GmailApp.sendEmail(CONFIG.NOTIFY_EMAIL, subject, body, {
    replyTo: email,
    name: 'GTF Booking System'
  });

  // 2️⃣ Update Notion lead status to "Interested" (paid)
  createNotionLead({
    name,
    email,
    phone,
    date,
    notes: `PAYMENT CONFIRMED via ${method}. ` + notes,
    amount: amount || '₹1,000',
    status: 'Interested',
    type: 'Counselling Booking'
  });
}


// ─── NOTION API HELPER ────────────────────────────────────────────────────────

function createNotionLead({ name, email, phone, date, notes, amount, status, type }) {
  const url = 'https://api.notion.com/v1/pages';

  const payload = {
    parent: { database_id: CONFIG.NOTION_DATABASE_ID },
    properties: {
      // ── Adjust property names below to match YOUR Notion DB column names ──
      'Name': {
        title: [{ text: { content: name || 'Unknown' } }]
      },
      'Email': {
        email: email || ''
      },
      'Phone': {
        phone_number: phone || ''
      },
      'Status': {
        select: { name: status || 'New' }
      },
      'Type': {
        select: { name: type || 'Counselling Booking' }
      },
      'Session Date': {
        date: date ? { start: date } : null
      },
      'Amount': {
        rich_text: [{ text: { content: amount || '₹1,000' } }]
      },
      'Notes': {
        rich_text: [{ text: { content: (notes || '').substring(0, 2000) } }]
      }
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + CONFIG.NOTION_TOKEN,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  Logger.log('Notion response code: ' + responseCode);
  Logger.log('Notion response body: ' + response.getContentText());

  if (responseCode !== 200) {
    Logger.log('Notion API error: ' + response.getContentText());
  }
}
