# Sol WhatsApp bot

This separate Node.js service uses Baileys to receive direct WhatsApp messages. The first version offers a small menu, explains the solar process, collects consent and quote details, submits quote or sales call-back requests to the app's existing anonymous `POST /api/leads` endpoint, and shows a verified customer's own portal summary. It does not create its own customer or lead database.

Customers can choose `4` or reply `ACCOUNT` to check their project. The bot sends a one-time code to their account email, accepts the code in the chat, and then uses the API's customer session to show a short quote, installation, and warranty summary. It does not take payment or make changes to an account. The app's current quote-pay operation records a payment state in its database; it is not connected to a payment provider, so this bot does not offer payment actions or treat that record as payment-provider confirmation.

## Local setup

Requirements: Node.js 20.6 or newer, npm, the Sol API and marketing website running locally, and a WhatsApp account that can link a device.

1. From this folder, if `.env` does not exist, copy `.env.example` to `.env`; adjust the API/site URLs if needed.
2. Run `npm install`.
3. Run `npm start` and scan the QR code from WhatsApp → Settings → Linked devices → Link a device.
4. Send `MENU` to the linked account from a separate WhatsApp account, then try the quote request flow.

The bot requires the API at `SOL_API_BASE_URL` and the marketing site at `SOL_CUSTOMER_SITE_URL`. A completed quote request is saved in the app database through the existing lead endpoint and triggers the app's existing notifications.

The app defaults to a recording email provider in Development, so email OTP sign-in will not send a code to an inbox with that default. Configure a real development mail sender in the backend before using the `ACCOUNT` menu; the bot itself does not send or log OTP codes.

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
