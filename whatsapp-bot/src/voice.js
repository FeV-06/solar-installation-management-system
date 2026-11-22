import { createHmac, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import { URL } from 'node:url';
import WebSocket, { WebSocketServer } from 'ws';

const AGENT_URL = 'wss://agent.deepgram.com/v1/agent/converse';
const AGENT_PROMPT = `You are a conversational voice assistant for the Sol solar installation management app. Talk naturally and answer the caller's actual question, including general knowledge questions, follow-ups, and questions about how to use the Sol app. Do not repeat the greeting or a menu, do not keep talking after the caller interrupts, and do not force every conversation toward sales. Give a direct answer first, then offer one useful follow-up. Keep answers clear and spoken, normally two to four sentences. The caller may speak English, Hindi, or Hinglish; understand and respond in the same language when possible.

FACTS ABOUT THIS PROJECT: This repository contains a software demo for a fictional solar company, Sol Energy. Do not claim Sol Energy is a real operating company or that real people will follow up. The site says quote requests are stored and confirmed by email but nobody follows them up. The demo website has quote request forms and pages explaining the process. The staff application manages leads, customers, surveys, installations, service tickets, production, notifications, and users. The customer portal is designed to show quote/project progress, proposals, equipment warranties, and service claims. The documented example installation journey is: request a quote; Sol contacts the customer at their chosen time; if the customer wants to proceed, a survey is booked; then survey, design, permits, installation, inspection, and switch-on/production monitoring. The repository's six-step copy mentions city/county and utility approvals; if asked about the exact real-world process, explain that requirements vary by location. You can explain these app pages and workflows from these facts. If a detail is not in this context, be candid and suggest where in the app to check.

Never make up live database state, prices, savings, system sizing, subsidy eligibility, schedules, customer records, or provider balances. Do not disclose one customer's private project details to another caller. The phone bot has no tools connected: it cannot look up an account, submit a quote, create a ticket, or change data. Clearly say so if asked to perform those actions; direct the caller to the app. Never claim an action was completed unless a connected tool confirms it.`;
const GREETING = 'Hi, I’m Sol’s app assistant. You can ask me about the app, solar, or anything else.';

export function createVoiceStreamTwiml(publicUrl, streamToken, caller) {
  const streamUrl = new URL('/voice/stream', publicUrl);
  streamUrl.protocol = 'wss:';
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="${escapeXml(streamUrl.toString())}"><Parameter name="stream_token" value="${escapeXml(streamToken)}"/><Parameter name="caller" value="${escapeXml(caller)}"/></Stream></Connect></Response>`;
}

export function startVoiceService({ env = process.env, logger = console }) {
  const config = readConfig(env);
  if (!config) {
    logger.log('Phone calling is disabled. Configure the SOL_VOICE_*, SOL_TWILIO_AUTH_TOKEN, and DEEPGRAM_API_KEY settings to enable it.');
    return null;
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', config.publicUrl);
    if (request.method !== 'POST' || url.pathname !== '/voice/incoming') {
      response.writeHead(404).end();
      return;
    }
    let rawBody;
    try {
      rawBody = await readRequestBody(request, 16_384);
    } catch {
      response.writeHead(413).end();
      return;
    }
    const body = Object.fromEntries(new URLSearchParams(rawBody).entries());
    if (!verifyTwilioSignature(config.authToken, request.headers['x-twilio-signature'], `${config.publicUrl}/voice/incoming`, body)) {
      response.writeHead(403).end();
      return;
    }
    if (config.phoneNumber && normalizePhone(body.To) !== config.phoneNumber) {
      response.writeHead(403).end();
      return;
    }
    const caller = normalizePhone(body.From) ?? '';
    response.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' })
      .end(createVoiceStreamTwiml(config.publicUrl, config.streamToken, caller));
  });

  const sockets = new WebSocketServer({ noServer: true, maxPayload: 1_048_576 });
  server.on('upgrade', (request, socket, head) => {
    if (new URL(request.url ?? '/', config.publicUrl).pathname !== '/voice/stream') {
      socket.destroy();
      return;
    }
    sockets.handleUpgrade(request, socket, head, (websocket) => sockets.emit('connection', websocket));
  });
  sockets.on('connection', (twilio) => attachCall(twilio, config, logger));
  server.listen(config.port, config.host, () => {
    logger.log(`Phone bot listening on ${config.host}:${config.port}; configure the Twilio number webhook at ${config.publicUrl}/voice/incoming`);
  });
  server.on('error', (error) => logger.error('Phone bot server failed:', error.message));
  return server;
}

function readConfig(env) {
  const required = ['SOL_VOICE_PUBLIC_URL', 'SOL_VOICE_STREAM_TOKEN', 'SOL_TWILIO_AUTH_TOKEN', 'DEEPGRAM_API_KEY'];
  if (required.some((key) => !env[key])) return null;
  const parsed = new URL(env.SOL_VOICE_PUBLIC_URL);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('SOL_VOICE_PUBLIC_URL must be a public HTTPS origin without credentials, path, query, or fragment.');
  }
  if (env.SOL_VOICE_STREAM_TOKEN.length < 32) throw new Error('SOL_VOICE_STREAM_TOKEN must contain at least 32 characters.');
  const phoneNumber = env.SOL_VOICE_PHONE_NUMBER ? normalizePhone(env.SOL_VOICE_PHONE_NUMBER) : null;
  if (env.SOL_VOICE_PHONE_NUMBER && !phoneNumber) throw new Error('SOL_VOICE_PHONE_NUMBER must be an E.164 phone number.');
  const port = Number(env.SOL_VOICE_PORT || 3100);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SOL_VOICE_PORT must be a valid TCP port.');
  return {
    publicUrl: parsed.toString().replace(/\/$/, ''), streamToken: env.SOL_VOICE_STREAM_TOKEN,
    authToken: env.SOL_TWILIO_AUTH_TOKEN, deepgramKey: env.DEEPGRAM_API_KEY, phoneNumber,
    host: env.SOL_VOICE_HOST || '0.0.0.0', port,
  };
}

function attachCall(twilio, config, logger) {
  let streamSid;
  let callSid;
  let caller;
  let agent;
  let authorized = false;
  let settingsApplied = false;
  let closed = false;
  const inboundAudio = [];
  let inboundBytes = 0;
  let loggedFirstInboundFrame = false;

  const close = () => {
    if (closed) return;
    closed = true;
    if (agent && agent.readyState < WebSocket.CLOSING) agent.close();
  };

  function sendAgentSettings() {
    agent.send(JSON.stringify({
      type: 'Settings',
      audio: {
        input: { encoding: 'mulaw', sample_rate: 8000 },
        output: { encoding: 'mulaw', sample_rate: 8000, container: 'none' },
      },
      agent: {
        language: 'en',
        listen: { provider: { type: 'deepgram', version: 'v2', model: 'flux-general-multi', language_hints: ['en', 'hi'] } },
        think: {
          provider: { type: 'open_ai', model: 'gpt-4o-mini', temperature: 0.4 },
          prompt: AGENT_PROMPT,
        },
        speak: { provider: { type: 'deepgram', model: 'aura-2-thalia-en' } },
        greeting: GREETING,
      },
    }));
  }

  function flushInbound() {
    if (!settingsApplied || !agent || agent.readyState !== WebSocket.OPEN) return;
    for (const chunk of inboundAudio.splice(0)) agent.send(chunk);
    inboundBytes = 0;
  }

  function sendTwilioAudio(audio) {
    if (closed || twilio.readyState !== WebSocket.OPEN || !streamSid || audio.length === 0) return;
    // Keep each Media message within the Twilio stream's preferred 20 ms frame size.
    const chunkSize = 160;
    for (let offset = 0; offset < audio.length; offset += chunkSize) {
      twilio.send(JSON.stringify({ event: 'media', streamSid, media: { payload: audio.subarray(offset, offset + chunkSize).toString('base64') } }));
    }
  }

  function handleAgentMessage(data, isBinary) {
    if (isBinary) {
      sendTwilioAudio(Buffer.from(data));
      return;
    }
    let event;
    try { event = JSON.parse(data.toString()); } catch { return; }
    if (event.type === 'Welcome') {
      logger.log(`[phone call ${callSid}] Deepgram voice agent connected; applying settings.`);
      sendAgentSettings();
    } else if (event.type === 'SettingsApplied') {
      settingsApplied = true;
      logger.log(`[phone call ${callSid}] Deepgram voice agent ready; forwarding caller audio.`);
      flushInbound();
    } else if (event.type === 'UserStartedSpeaking') {
      if (twilio.readyState === WebSocket.OPEN && streamSid) {
        twilio.send(JSON.stringify({ event: 'clear', streamSid }));
      }
    } else if (event.type === 'ConversationText') {
      logger.log(`[phone call ${callSid} ${event.role ?? 'unknown'}] ${String(event.content ?? '').slice(0, 400)}`);
    } else if (event.type === 'Warning') {
      logger.warn('Deepgram voice agent warning:', event.description ?? event.message ?? 'unknown warning');
    } else if (event.type === 'Error') {
      logger.error('Deepgram voice agent error:', event.description ?? event.message ?? 'unknown error');
    }
  }

  twilio.on('message', (raw) => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    if (message.event === 'start') {
      const params = message.start?.customParameters ?? {};
      if (!safeEqual(params.stream_token ?? '', config.streamToken)) {
        twilio.close(1008, 'Unauthorized media stream');
        return;
      }
      caller = normalizePhone(params.caller) ?? normalizePhone(message.start?.from);
      callSid = message.start?.callSid;
      streamSid = message.start?.streamSid;
      if (!caller || !streamSid || !callSid) {
        twilio.close(1008, 'Missing call details');
        return;
      }
      authorized = true;
      agent = new WebSocket(AGENT_URL, { headers: { Authorization: `Token ${config.deepgramKey}` } });
      agent.on('message', handleAgentMessage);
      agent.on('error', (error) => logger.error('Deepgram voice agent connection failed:', error.message));
      agent.on('close', (code, reason) => {
        if (!closed) logger.error('Deepgram voice agent closed:', code, reason.toString());
        close();
      });
      return;
    }
    if (!authorized) return;
    if (message.event === 'media' && message.media?.track === 'inbound' && typeof message.media.payload === 'string') {
      const audio = Buffer.from(message.media.payload, 'base64');
      if (!loggedFirstInboundFrame) {
        loggedFirstInboundFrame = true;
        logger.log(`[phone call ${callSid}] first caller audio frame received (${audio.length} bytes).`);
      }
      if (settingsApplied && agent?.readyState === WebSocket.OPEN) agent.send(audio);
      else if (agent && agent.readyState < WebSocket.CLOSING && inboundBytes + audio.length <= 256_000) {
        inboundAudio.push(audio);
        inboundBytes += audio.length;
      }
    } else if (message.event === 'stop') {
      close();
    }
  });
  twilio.on('close', close);
  twilio.on('error', (error) => logger.error('Phone media connection failed:', error.message));
}

function normalizePhone(value) {
  if (typeof value !== 'string') return null;
  const compact = value.replace(/[\s().-]/g, '');
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : null;
}

function verifyTwilioSignature(authToken, signature, url, params) {
  if (typeof signature !== 'string' || !signature) return false;
  const canonical = Object.keys(params).sort().reduce((value, key) => value + key + params[key], url);
  const expected = createHmac('sha1', authToken).update(canonical, 'utf8').digest('base64');
  return safeEqual(signature, expected);
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function readRequestBody(request, maxBytes) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) {
        reject(new Error('Request body too large'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function escapeXml(value) {
  return value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]);
}
