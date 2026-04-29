#!/usr/bin/env node
/**
 * Saathi AI — Push Notification CLI Sender
 * =========================================
 * Usage:
 *   node send-notification.js
 *
 * Or pipe a JSON config:
 *   node send-notification.js --title "Soil Alert" --body "Low Nitrogen" --token "ExponentPushToken[xxx]"
 *
 * Dependencies: none (uses Node.js built-in fetch, Node 18+)
 */

// ─── CONFIG ─────────────────────────────────────────────────────────────────
// Edit these defaults for quick repeated sends:
const DEFAULTS = {
  title    : 'Saathi AI 🌱',
  body     : 'Your soil report is ready. Tap to view recommendations.',
  subtitle : '',              // subheading (iOS only visible on lockscreen)
  url      : '',              // deep link: "saathiai://history" or https://...
  type     : 'system',       // alert | insight | reminder | system | sync | battery
  tokens   : [
    // ✏️  Paste your Expo Push Tokens here (one per line)
    // 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  ],
};

// ─── EXPO PUSH API ───────────────────────────────────────────────────────────
const EXPO_API = 'https://exp.host/--/api/v2/push/send';

// ─── ARGUMENT PARSER ─────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { ...DEFAULTS };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--title':    result.title    = args[++i]; break;
      case '--body':     result.body     = args[++i]; break;
      case '--subtitle': result.subtitle = args[++i]; break;
      case '--url':      result.url      = args[++i]; break;
      case '--type':     result.type     = args[++i]; break;
      case '--token':    result.tokens   = [...result.tokens, args[++i]]; break;
    }
  }
  return result;
}

// ─── BUILD MESSAGE ────────────────────────────────────────────────────────────
function buildMessage(to, config) {
  const msg = {
    to,
    title    : config.title,
    body     : config.body,
    sound    : 'default',
    priority : 'high',
    channelId: config.type === 'alert' ? 'alerts' : 'default',
    data     : {
      type: config.type,
      ...(config.url ? { url: config.url } : {}),
    },
  };
  if (config.subtitle) msg.subtitle = config.subtitle;
  return msg;
}

// ─── SEND ─────────────────────────────────────────────────────────────────────
async function send(config) {
  const { tokens } = config;

  if (!tokens.length) {
    console.error('\n❌  No tokens provided.\n');
    console.log('   Either edit DEFAULTS.tokens in this file, or run:');
    console.log('   node send-notification.js --token "ExponentPushToken[...]"\n');
    process.exit(1);
  }

  // Validate token format
  const invalid = tokens.filter(t => !t.startsWith('ExponentPushToken['));
  if (invalid.length) {
    console.error('\n❌  Invalid token format:', invalid);
    console.error('   Must start with ExponentPushToken[\n');
    process.exit(1);
  }

  console.log('\n🚀  Saathi AI Notification Sender');
  console.log('─'.repeat(44));
  console.log(`📬  Title    : ${config.title}`);
  console.log(`💬  Body     : ${config.body}`);
  if (config.subtitle) console.log(`📝  Subtitle : ${config.subtitle}`);
  if (config.url)      console.log(`🔗  URL      : ${config.url}`);
  console.log(`🏷️   Type     : ${config.type}`);
  console.log(`📱  Tokens   : ${tokens.length}`);
  console.log('─'.repeat(44));

  // Chunk into batches of 100
  const CHUNK = 100;
  let totalOk = 0, totalFail = 0;

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const batch = tokens.slice(i, i + CHUNK);
    const messages = batch.map(t => buildMessage(t, config));

    process.stdout.write(`\n   Sending batch ${Math.floor(i / CHUNK) + 1}/${Math.ceil(tokens.length / CHUNK)}... `);

    try {
      const res = await fetch(EXPO_API, {
        method : 'POST',
        headers: {
          'Content-Type'   : 'application/json',
          'Accept'         : 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });

      const json = await res.json();
      const results = json.data || [];

      const ok   = results.filter(r => r.status === 'ok').length;
      const fail = results.filter(r => r.status === 'error');

      totalOk   += ok;
      totalFail += fail.length;

      console.log(`✅  ${ok} OK  |  ❌ ${fail.length} failed`);

      if (fail.length) {
        fail.forEach(f => console.warn(`      ⚠️  ${f.message} (${f.details?.error})`));
      }
    } catch (err) {
      totalFail += batch.length;
      console.error(`\n   ❌  Network error: ${err.message}`);
    }
  }

  console.log('\n' + '─'.repeat(44));
  console.log(`✅  Total sent: ${totalOk}   ❌ Failed: ${totalFail}`);
  console.log('─'.repeat(44) + '\n');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const config = parseArgs();
send(config).catch(console.error);
