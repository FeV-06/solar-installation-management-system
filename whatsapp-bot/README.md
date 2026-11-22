# Sol WhatsApp bot

This separate Node.js service uses Baileys to receive direct WhatsApp messages. The first version offers a small menu, explains the solar process, collects consent and quote details, submits quote or sales call-back requests to the app's existing anonymous `POST /api/leads` endpoint, and shows a verified customer's own portal summary. It does not create its own customer or lead database.

Customers can choose `4` or reply `ACCOUNT` to check their project. The bot sends a one-time code to their account email, accepts the code in the chat, and then uses the API's customer session to show a short quote, installation, and warranty summary. It does not take payment or make changes to an account. The app's current quote-pay operation records a payment state in its database; it is not connected to a payment provider, so this bot does not offer payment actions or treat that record as payment-provider confirmation.

## Local setup

Requirements: Node.js 20.6 or newer, npm, the Sol API and marketing website running locally, and a WhatsApp account that can link a device.

1. From this folder, if `.env` does not exist, copy `.env.example` to `.env`; adjust the API/site URLs if needed.
2. Run `npm install`.
3. Run `npm start` and scan the QR code from WhatsApp â†’ Settings â†’ Linked devices â†’ Link a device.
4. Send `MENU` to the linked account from a separate WhatsApp account, then try the quote request flow.

The bot requires the API at `SOL_API_BASE_URL` and the marketing site at `SOL_CUSTOMER_SITE_URL`. A completed quote request is saved in the app database through the existing lead endpoint and triggers the app's existing notifications.

The app defaults to a recording email provider in Development, so email OTP sign-in will not send a code to an inbox with that default. Configure a real development mail sender in the backend before using the `ACCOUNT` menu; the bot itself does not send or log OTP codes.

## Phone-call bot (Twilio + Deepgram)

The same service can answer inbound phone calls. Twilio Programmable Voice supplies the phone number and bidirectional call-audio stream. Deepgram Voice Agent handles live listening, conversational answers, and speech, including questions such as how a solar quote is prepared. Phone calls use an LLM-backed conversation; WhatsApp keeps its existing menu and guided intake. This voice setup answers questions only and does not submit quote or callback requests. It does not invent account-specific details, prices, savings, subsidies, or timelines; callers needing a quote or account help are directed to the website or sales team.

1. In `whatsapp-bot/.env`, set `SOL_VOICE_PUBLIC_URL` to the public HTTPS origin that forwards `/voice/*` to this service, `SOL_VOICE_STREAM_TOKEN` to a random secret of at least 32 characters, `SOL_TWILIO_AUTH_TOKEN`, and `DEEPGRAM_API_KEY`. Optionally set `SOL_VOICE_PHONE_NUMBER`. The conversational model is provided through Deepgram Voice Agent; no separate OpenAI key is required.
2. Expose `SOL_VOICE_PORT` (default `3100`) behind HTTPS/WSS on port 443. Twilio must be able to reach it; do not expose the local development server directly.
3. In Twilio, assign or port the phone number you choose, then set its incoming Voice webhook to `https://<public-host>/voice/incoming` using HTTP POST. The app does not purchase, assign, or configure the number in your Twilio account.
4. Start the existing bot service with `npm start`. When voice settings are missing, voice calling stays disabled and WhatsApp works as before.

The inbound webhook validates Twilio's signature. The WebSocket stream requires the configured stream token. Twilio call audio is sent to Deepgram Voice Agent as 8 kHz mu-law audio, and generated audio is relayed back to Twilio. The service does not record calls or persist transcripts. Callers can interrupt the agent while it is speaking. Real calls require a Twilio account and number, a reachable HTTPS/WSS host, and Deepgram API access; local code checks do not establish those provider-side settings.

### One-off outbound voice test

Set `SOL_TWILIO_ACCOUNT_SID` and `SOL_VOICE_CALL_TARGET` in `.env`. The `npm run call:me` command places one outbound call from `SOL_VOICE_PHONE_NUMBER` and connects it to the same Deepgram voice bot. `SOL_VOICE_OUTBOUND_MAX_SECONDS` is blank by default, which removes the app-level duration limit; set it from 1 to 14,400 seconds to add a cap. Twilio trial accounts only call verified destinations. Calls are chargeable and continue until the caller hangs up or Twilio ends them.

## Data and session handling

- Baileys session keys are stored under `runtime/auth` by default. Treat them like account credentials. They are ignored by Git; do not copy them into chat or share the folder.
- In-progress answers exist only in process memory and expire after 30 minutes. A bot restart clears any unfinished form. The message-ID de-duplication cache is also memory-only.
- Verified customer sessions are held in process memory until the app's session token expires (normally 8 hours), until `STOP`/`ACCOUNT LOGOUT`, or until bot restart. They are never written to disk.
- Message text, phone numbers, and QR/session material are not written to application logs by this service.
- Customers must reply `YES` before quote details are collected. `STOP` or `CANCEL` clears the unfinished request.
- `ACCOUNT` access uses the app's email OTP verification endpoints, which are rate limited. The bot does not send the OTP through WhatsApp.
- This service only supports phone-number JIDs for quote submissions. If WhatsApp presents a linked-device ID instead, it directs the customer to the web quote form.

## Important limits

Baileys is an unofficial WhatsApp Web client. WhatsApp may change its protocol or restrict an account. This first version is for local development and a limited pilot, not a reliability or policy guarantee for a production customer channel. Review WhatsApp's terms and customer consent requirements before connecting a business number. The Baileys v7 release candidate also has breaking changes; this project pins the version used by the current docs instead of taking an unbounded upgrade.

The quote intake supports India, matching the current marketing form. It asks for a state code and postal code rather than collecting a live location. Payment, account changes, fault-ticket creation, and proactive outbound notifications are not enabled in this first version.
