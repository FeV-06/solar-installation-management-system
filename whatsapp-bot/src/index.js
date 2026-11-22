import path from 'node:path';
import { fileURLToPath } from 'node:url';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { createConversationHandler, extractText } from './conversation.js';
import { startVoiceService } from './voice.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const apiBaseUrl = requiredUrl('SOL_API_BASE_URL');
const siteUrl = requiredUrl('SOL_CUSTOMER_SITE_URL');
const authDir = path.resolve(root, process.env.SOL_WHATSAPP_AUTH_DIR || './runtime/auth');
const allowGroups = process.env.SOL_ALLOW_GROUPS === 'true';
const handleMessage = createConversationHandler({
  apiBaseUrl,
  siteUrl,
  send: async (jid, text) => {
    if (!socket) throw new Error('WhatsApp is not connected.');
    await socket.sendMessage(jid, { text });
  },
});

const voiceServer = startVoiceService();

let socket;
let reconnectTimer;
let stopped = false;
let reconnectAttempt = 0;

function requiredUrl(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set in whatsapp-bot/.env`);
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`${name} must use http or https`);
  if (parsed.username || parsed.password) throw new Error(`${name} must not include URL credentials`);
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  if (parsed.protocol !== 'https:' && !localHosts.has(parsed.hostname)) {
    throw new Error(`${name} must use HTTPS outside local development`);
  }
  return parsed.toString().replace(/\/$/, '');
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  socket = makeWASocket({ auth: state });
  socket.ev.on('creds.update', saveCreds);
  socket.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('Scan this QR with the WhatsApp account you want to link:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      reconnectAttempt = 0;
      console.log('WhatsApp connected. Customer intake menu is ready.');
    }
    if (connection === 'close' && !stopped) {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut || code === DisconnectReason.forbidden || code === DisconnectReason.badSession) {
        console.error('WhatsApp session ended. Stop the bot, remove its local auth folder, then pair it again.');
        return;
      }
      const delay = Math.min(60000, 2000 * 2 ** Math.min(reconnectAttempt++, 5));
      console.log(`WhatsApp disconnected; reconnecting in ${Math.ceil(delay / 1000)} seconds.`);
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => void connect().catch(reportFailure), delay);
    }
  });
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const message of messages) {
      if (!message.key || message.key.fromMe || !message.message) continue;
      const jid = message.key.remoteJid;
      if (!jid || jid === 'status@broadcast') continue;
      if (jid.endsWith('@g.us') && !allowGroups) continue;
      const text = extractText(message).trim();
      if (!text) continue;
      try {
        await handleMessage(jid, message.key.id, text, message.key.remoteJidAlt);
      } catch (error) {
        console.error('Message handling failed:', error instanceof Error ? error.message : 'unknown error');
      }
    }
  });
}

function reportFailure(error) {
  console.error('Could not start the WhatsApp connection:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
}

function shutdown() {
  stopped = true;
  clearTimeout(reconnectTimer);
  socket?.end(new Error('Bot is shutting down.'));
  voiceServer?.close();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
connect().catch(reportFailure);
