const PRIVACY_NOTICE = 'I can collect contact and property details to send a solar quote request to the Sol team. The team will use them to respond to your request. Reply YES to continue or STOP to cancel. Privacy details: {privacyUrl}';

const MENU = [
  'Hi, welcome to Sol Solar. How can we help?',
  '',
  '1. Request a solar quote',
  '2. Learn how solar installation works',
  '3. Request a sales call-back',
  '4. Check my request or project',
  '',
  'Reply MENU at any time to see these options, or STOP to end the chat.',
].join('\n');

const FAQ = 'Our team reviews your electricity use and property details, then arranges a roof survey when appropriate. A quote follows the survey. You can read more here: {siteUrl}/how-it-works';

const STEPS = [
  ['firstName', 'What is your first name?'],
  ['lastName', 'What is your last name?'],
  ['email', 'What email address should the team use?'],
  ['propertyStreet', 'What is the property street address? Please do not send a live location.'],
  ['propertyCity', 'What city is the property in?'],
  ['propertyState', 'What is the state or union territory code? For example, KA or DL.'],
  ['propertyZipCode', 'What is the 6-digit Indian postal code?'],
  ['propertyType', 'What type of property is it? Reply HOUSE, APARTMENT, or COMMERCIAL.'],
  ['isPropertyOwner', 'Do you own the property? Reply YES or NO.'],
  ['monthlyBillRange', 'About how much is the monthly electricity bill? Reply 1 (under ₹2,000), 2 (₹2,000–₹5,000), 3 (₹5,000–₹10,000), or 4 (over ₹10,000).'],
  ['bestTimeToContact', 'When should the team contact you? Reply MORNING, AFTERNOON, or EVENING.'],
];

const BILL_RANGES = {
  '1': 'under2000',
  '2': '2000-5000',
  '3': '5000-10000',
  '4': '10000plus',
};
const PROPERTY_TYPES = {
  house: 'House',
  apartment: 'Apartment',
  commercial: 'Commercial',
};
const CONTACT_TIMES = new Set(['morning', 'afternoon', 'evening']);

export function extractText(message) {
  const content = message?.message;
  return content?.conversation
    ?? content?.extendedTextMessage?.text
    ?? content?.buttonsResponseMessage?.selectedButtonId
    ?? content?.listResponseMessage?.singleSelectReply?.selectedRowId
    ?? content?.templateButtonReplyMessage?.selectedId
    ?? '';
}

export function createConversationHandler({ apiBaseUrl, siteUrl, send }) {
  const conversations = new Map();
  const lastSeen = new Map();
  const chatQueues = new Map();
  const customerSessions = new Map();

  async function reply(jid, text) {
    await send(jid, text);
  }

  async function saveLead(jid, answers, alternateJid) {
    const phoneNumber = phoneFromJid(jid) ?? phoneFromJid(alternateJid) ?? phoneFromVoiceId(jid);
    if (!phoneNumber) {
      conversations.delete(jid);
      await reply(jid, `I could not read a phone number from this chat. Please send the request through our secure quote form: ${siteUrl}/quote`);
      return;
    }

    const request = {
      ...answers,
      phoneNumber,
      propertyCountry: 'IN',
      propertyLatitude: null,
      propertyLongitude: null,
      notes: answers.notes ? `${answers.notes}\n\nSubmitted through WhatsApp.` : 'Submitted through WhatsApp.',
    };

    let response;
    try {
      response = await fetch(`${apiBaseUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, application/problem+json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      await reply(jid, `I could not reach the quote service. Your answers have not been submitted. Please try the form: ${siteUrl}/quote`);
      return;
    }

    if (!response.ok) {
      // Do not echo validation payloads: they may include customer-entered content.
      await reply(jid, `I could not submit those details. Please check the state code and postal code, or use our form: ${siteUrl}/quote`);
      return;
    }

    const result = await response.json().catch(() => ({}));
    conversations.delete(jid);
    await reply(jid, `Thanks, ${answers.firstName}. Your quote request was sent to the Sol team (request ${result.id ?? 'received'}). They will contact you during your preferred time. Reply MENU for other options.`);
  }

  async function showCustomerPortal(jid) {
    const session = customerSessions.get(jid);
    if (!session || session.expiresAt <= Date.now()) {
      customerSessions.delete(jid);
      await reply(jid, 'Your secure session expired. Reply ACCOUNT to sign in again.');
      return;
    }

    let response;
    try {
      response = await fetch(`${apiBaseUrl}/api/customer-portal`, {
        headers: { Accept: 'application/json', Cookie: session.cookie },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      await reply(jid, `I could not reach the customer portal. You can view your account securely here: ${siteUrl}/signin`);
      return;
    }
    if (response.status === 401) {
      customerSessions.delete(jid);
      await reply(jid, `Your secure session expired. Reply ACCOUNT to sign in again, or use ${siteUrl}/signin`);
      return;
    }
    if (!response.ok) {
      await reply(jid, `I could not load your project right now. Please try again later or use ${siteUrl}/portal`);
      return;
    }

    const data = await response.json();
    const lines = ['Your Sol account summary:'];
    if (data.quotes?.length) {
      lines.push('', 'Quote requests:');
      for (const quote of data.quotes.slice(0, 5)) {
        lines.push(`• #${quote.id} — ${quote.status} (${quote.propertyType}, ${quote.propertyAddress})`);
      }
    }
    if (data.proposal) {
      const proposal = data.proposal;
      lines.push('', `Proposal: ${proposal.systemCapacityKw} kW ${proposal.systemType}`, `Status: ${proposal.status} / ${proposal.paymentStatus}`, `Total: ${rupees(proposal.totalAmountRupees)}; paid: ${rupees(proposal.amountPaidRupees)}; advance due: ${rupees(proposal.advanceRequiredRupees)}`);
    }
    if (data.installations?.length) {
      lines.push('', 'Installation status:');
      for (const installation of data.installations.slice(0, 5)) lines.push(`#${installation.id} — ${installation.status}`);
    }
    if (data.warranties?.length) {
      lines.push('', 'Warranty coverage:');
      for (const warranty of data.warranties.slice(0, 8)) {
        const coverage = warranty.isCovered ? `covered, ${warranty.remainingDays} days remaining` : warranty.status;
        lines.push(`${warranty.itemName}: ${coverage} (through ${new Date(warranty.expiryDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
      }
    }
    if (!data.quotes?.length && !data.proposal && !data.installations?.length && !data.warranties?.length) {
      lines.push('', 'No quote or installation is linked to this account yet. You can request a quote here: ' + `${siteUrl}/quote`);
    }
    lines.push('', 'For full details, use the secure portal: ' + `${siteUrl}/portal`, 'Reply ACCOUNT LOGOUT to end this WhatsApp session.');
    await reply(jid, lines.join('\n'));
  }

  function rupees(value) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  async function handle(jid, incoming, alternateJid) {
    const text = incoming.trim();
    const command = text.toLowerCase();
    const existing = conversations.get(jid);

    if (command === 'stop' || command === 'cancel') {
      conversations.delete(jid);
      if (command === 'stop') customerSessions.delete(jid);
      await reply(jid, 'Understood. I stopped this request and cleared its in-progress answers. Send MENU whenever you want to start again.');
      return;
    }
    if (command === 'account logout' || command === 'logout') {
      conversations.delete(jid);
      customerSessions.delete(jid);
      await reply(jid, 'Your WhatsApp account session has been cleared.');
      return;
    }
    if (command === 'menu' || command === 'hi' || command === 'hello' || command === 'start') {
      conversations.delete(jid);
      await reply(jid, MENU);
      return;
    }

    if (existing?.step === 'consent') {
      if (command !== 'yes') {
        await reply(jid, 'I will not collect quote details unless you agree. Reply YES to continue, MENU for options, or STOP to end.');
        return;
      }
      existing.step = 0;
      await reply(jid, STEPS[0][1]);
      return;
    }

    if (existing?.step === 'account-email') {
      const email = text.trim();
      if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        await reply(jid, 'Please enter a valid email address, or reply CANCEL.');
        return;
      }
      let response;
      try {
        response = await fetch(`${apiBaseUrl}/api/customer-auth/request-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json, application/problem+json' },
          body: JSON.stringify({ email }),
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        conversations.delete(jid);
        await reply(jid, `I could not reach sign-in. Please try again later: ${siteUrl}/signin`);
        return;
      }
      if (!response.ok) {
        conversations.delete(jid);
        await reply(jid, `I could not start sign-in. Please wait a minute or use the secure portal: ${siteUrl}/signin`);
        return;
      }
      existing.step = 'account-otp';
      existing.email = email;
      existing.expiresAt = Date.now() + 5 * 60 * 1000;
      await reply(jid, 'If this email can sign in, a 6-digit code has been sent to its inbox. Enter the code here within 5 minutes. Do not share the code with anyone.');
      return;
    }

    if (existing?.step === 'account-otp') {
      if (!/^\d{6}$/.test(text.trim())) {
        await reply(jid, 'Enter the 6-digit code sent to your email, or reply CANCEL.');
        return;
      }
      let response;
      try {
        response = await fetch(`${apiBaseUrl}/api/customer-auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json, application/problem+json' },
          body: JSON.stringify({ email: existing.email, code: text.trim() }),
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        conversations.delete(jid);
        await reply(jid, `I could not verify that code. Start again with ACCOUNT or use ${siteUrl}/signin`);
        return;
      }
      if (!response.ok) {
        existing.expiresAt = Date.now() + 5 * 60 * 1000;
        await reply(jid, 'That code could not be verified. Check the latest email and try again, or reply CANCEL to stop.');
        return;
      }
      const setCookie = response.headers.get('set-cookie') ?? '';
      const cookie = setCookie.split(';', 1)[0];
      const customerCookieName = 'sol_customer_session=';
      if (!cookie.startsWith(customerCookieName) || !cookie.slice(customerCookieName.length)) {
        conversations.delete(jid);
        await reply(jid, `Sign-in succeeded, but this channel could not open your account session. Please use ${siteUrl}/signin`);
        return;
      }
      let expiresAt = Date.now() + 8 * 60 * 60 * 1000;
      try {
        const jwt = JSON.parse(Buffer.from(cookie.slice(customerCookieName.length).split('.')[1], 'base64url').toString('utf8'));
        if (Number.isFinite(jwt.exp)) expiresAt = jwt.exp * 1000;
      } catch { /* The API remains the authority and will reject an invalid or expired cookie. */ }
      customerSessions.set(jid, { cookie, expiresAt });
      conversations.delete(jid);
      await reply(jid, 'Email verified. I can now show the status associated with that customer account.');
      await showCustomerPortal(jid);
      return;
    }

    if (command === '4' || command === 'account' || command === 'project' || command === 'my project') {
      if (customerSessions.has(jid)) {
        await showCustomerPortal(jid);
      } else {
        conversations.set(jid, { step: 'account-email', expiresAt: Date.now() + 5 * 60 * 1000 });
        await reply(jid, 'To protect your project details, sign in with your customer email. I will send a one-time code to that email and ask you to enter it here. Reply CANCEL to stop.');
      }
      return;
    }

    if (existing && Number.isInteger(existing.step)) {
      const [field] = STEPS[existing.step];
      const value = text.trim();
      const maxLength = field === 'propertyStreet' ? 255 : field === 'propertyCity' ? 100 : 255;
      if (!value || value.length > maxLength) {
        await reply(jid, `Please enter a short answer. ${STEPS[existing.step][1]}`);
        return;
      }
      if ((field === 'firstName' || field === 'lastName') && value.length < 2) {
        await reply(jid, 'Please enter at least 2 characters for the name.');
        return;
      }
      if ((field === 'firstName' || field === 'lastName') && value.length > 100) {
        await reply(jid, 'Please keep each name to 100 characters or fewer.');
        return;
      }
      if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        await reply(jid, 'That does not look like an email address. Please try again, or reply STOP.');
        return;
      }
      if (field === 'propertyZipCode' && !/^[1-9]\d{5}$/.test(value)) {
        await reply(jid, 'Please enter a valid 6-digit Indian postal code.');
        return;
      }
      if (field === 'propertyState' && !/^[a-z]{2}$/i.test(value)) {
        await reply(jid, 'Please enter the two-letter state or union territory code, such as KA or DL.');
        return;
      }
      if (field === 'propertyType') {
        const normalized = value.toLowerCase();
        if (!PROPERTY_TYPES[normalized]) {
          await reply(jid, 'Please reply HOUSE, APARTMENT, or COMMERCIAL.');
          return;
        }
        existing.answers[field] = PROPERTY_TYPES[normalized];
      } else if (field === 'isPropertyOwner') {
        if (!['yes', 'no'].includes(command)) {
          await reply(jid, 'Please reply YES or NO.');
          return;
        }
        if (existing.answers.propertyType !== 'Commercial' && command !== 'yes') {
          conversations.delete(jid);
          await reply(jid, `The current quote service accepts owner-occupied homes and apartments. Please contact the team about leased or rented properties: ${siteUrl}/quote`);
          return;
        }
        existing.answers[field] = command === 'yes';
      } else if (field === 'monthlyBillRange') {
        if (!BILL_RANGES[command]) {
          await reply(jid, 'Please reply 1, 2, 3, or 4 to choose a bill range.');
          return;
        }
        existing.answers[field] = BILL_RANGES[command];
      } else if (field === 'bestTimeToContact') {
        if (!CONTACT_TIMES.has(command)) {
          await reply(jid, 'Please reply MORNING, AFTERNOON, or EVENING.');
          return;
        }
        existing.answers[field] = command[0].toUpperCase() + command.slice(1);
      } else {
        existing.answers[field] = value;
      }

      existing.expiresAt = Date.now() + 30 * 60 * 1000;
      existing.step += 1;
      if (existing.step === STEPS.length) {
        await reply(jid, 'One last optional question: is there anything about the roof or power needs the team should know? Reply with a short note, or SKIP.');
        existing.step = 'notes';
        return;
      }
      await reply(jid, STEPS[existing.step][1]);
      return;
    }

    if (existing?.step === 'notes') {
      const customerNote = command === 'skip' ? '' : text.slice(0, 500);
      if (customerNote) {
        existing.answers.notes = existing.answers.notes
          ? `${existing.answers.notes}\nCustomer note: ${customerNote}`
          : customerNote;
      }
      await saveLead(jid, existing.answers, alternateJid);
      return;
    }

    if (command === '1' || command === 'quote' || command === 'get a quote') {
      conversations.set(jid, { step: 'consent', answers: {}, expiresAt: Date.now() + 30 * 60 * 1000 });
      await reply(jid, PRIVACY_NOTICE.replace('{privacyUrl}', `${siteUrl}/privacy`));
      return;
    }
    if (command === '2' || command === 'how it works' || command === 'solar') {
      await reply(jid, FAQ.replace('{siteUrl}', siteUrl));
      return;
    }
    if (command === '3' || command === 'callback' || command === 'call back' || command === 'sales') {
      conversations.set(jid, {
        step: 'consent',
        answers: { notes: 'Sales call-back requested via WhatsApp.' },
        expiresAt: Date.now() + 30 * 60 * 1000,
      });
      await reply(jid, `I can send a sales call-back request with your solar enquiry. Reply YES to share the contact and property details, or STOP to cancel. Privacy details: ${siteUrl}/privacy`);
      return;
    }

    await reply(jid, MENU);
  }

  return async function processMessage(jid, messageId, text, alternateJid) {
    if (!jid || !messageId || !text || lastSeen.has(messageId)) return;
    lastSeen.set(messageId, Date.now());
    if (lastSeen.size > 5000) lastSeen.delete(lastSeen.keys().next().value);

    const previous = chatQueues.get(jid) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(async () => {
      const now = Date.now();
      for (const [chat, conversation] of conversations) {
        if (conversation.expiresAt <= now) conversations.delete(chat);
      }
      await handle(jid, text, alternateJid);
    });
    chatQueues.set(jid, current);
    try {
      await current;
    } finally {
      if (chatQueues.get(jid) === current) chatQueues.delete(jid);
    }
  };
}

function phoneFromJid(jid) {
  const match = /^(\d{7,15})@s\.whatsapp\.net$/.exec(jid);
  return match ? `+${match[1]}` : null;
}

function phoneFromVoiceId(id) {
  const match = /^voice:(\+[1-9]\d{6,14})$/.exec(id ?? '');
  return match?.[1] ?? null;
}
