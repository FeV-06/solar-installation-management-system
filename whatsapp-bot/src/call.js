import { createVoiceStreamTwiml } from './voice.js';

const requiredKeys = [
  'SOL_TWILIO_ACCOUNT_SID',
  'SOL_TWILIO_AUTH_TOKEN',
  'SOL_VOICE_PHONE_NUMBER',
  'SOL_VOICE_PUBLIC_URL',
  'SOL_VOICE_STREAM_TOKEN',
  'SOL_VOICE_CALL_TARGET',
];
for (const key of requiredKeys) {
  if (!process.env[key]) throw new Error(`${key} must be set in whatsapp-bot/.env`);
}

const accountSid = process.env.SOL_TWILIO_ACCOUNT_SID;
if (!/^AC[0-9a-f]{32}$/i.test(accountSid)) throw new Error('SOL_TWILIO_ACCOUNT_SID is not a valid Twilio Account SID.');
const twilioNumber = normalizePhone(process.env.SOL_VOICE_PHONE_NUMBER, 'SOL_VOICE_PHONE_NUMBER');
const target = normalizePhone(process.env.SOL_VOICE_CALL_TARGET, 'SOL_VOICE_CALL_TARGET');
const publicUrl = new URL(process.env.SOL_VOICE_PUBLIC_URL);
if (publicUrl.protocol !== 'https:' || publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash) {
  throw new Error('SOL_VOICE_PUBLIC_URL must be a public HTTPS origin.');
}
const streamToken = process.env.SOL_VOICE_STREAM_TOKEN;
if (streamToken.length < 32) throw new Error('SOL_VOICE_STREAM_TOKEN must contain at least 32 characters.');
const maxSecondsSetting = process.env.SOL_VOICE_OUTBOUND_MAX_SECONDS?.trim();
const maxSeconds = maxSecondsSetting ? Number(maxSecondsSetting) : null;
if (maxSeconds !== null && (!Number.isInteger(maxSeconds) || maxSeconds < 1 || maxSeconds > 14_400)) {
  throw new Error('SOL_VOICE_OUTBOUND_MAX_SECONDS must be between 1 and 14400 seconds, or blank for no application limit.');
}
const twiml = createVoiceStreamTwiml(publicUrl.toString(), streamToken, target);
const body = new URLSearchParams({ To: target, From: twilioNumber, Twiml: twiml });
if (maxSeconds !== null) body.set('TimeLimit', String(maxSeconds));
const authorization = Buffer.from(`${accountSid}:${process.env.SOL_TWILIO_AUTH_TOKEN}`).toString('base64');
const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
  method: 'POST',
  headers: { Authorization: `Basic ${authorization}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  body,
  signal: AbortSignal.timeout(15000),
});
const result = await response.json().catch(() => ({}));
if (!response.ok) {
  const code = result.code ? ` (Twilio code ${result.code})` : '';
  throw new Error(`Twilio did not start the call${code}. Check the account, verified destination, caller ID, and trial restrictions.`);
}
console.log(`Twilio accepted the call request (status: ${result.status ?? 'queued'}; ${maxSeconds === null ? 'no app duration limit' : `maximum duration: ${maxSeconds} seconds`}).`);

function normalizePhone(value, name) {
  const normalized = value.replace(/[\s().-]/g, '');
  if (!/^\+[1-9]\d{6,14}$/.test(normalized)) throw new Error(`${name} must be an E.164 phone number.`);
  return normalized;
}
