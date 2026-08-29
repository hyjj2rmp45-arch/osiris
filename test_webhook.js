const crypto = require('crypto');
const http = require('http');

const SECRET = 'test-bot-secret';
const WEBHOOK_URL = 'http://localhost:3000/api/telegram/webhook';

// Simulate a Telegram update (start command)
const update = {
  update_id: 1,
  message: {
    message_id: 1,
    date: Math.floor(Date.now() / 1000),
    chat: { id: 123456, type: 'private' },
    from: { id: 123456, is_bot: false, first_name: 'Test', username: 'testuser' },
    text: '/start'
  }
};

const body = JSON.stringify(update);

// Create HMAC signature
const signature = crypto
  .createHmac('sha256', SECRET)
  .update(body)
  .digest('hex');

console.log('Sending update with signature:', signature.substring(0, 16) + '...');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/telegram/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'X-Telegram-Bot-Api-Secret-Token': signature
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Response status:', res.statusCode);
    console.log('Response body:', data);
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
  process.exit(1);
});

req.write(body);
req.end();