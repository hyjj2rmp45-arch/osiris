const { Bot } = require('grammy');
process.env.TELEGRAM_BOT_TOKEN = '8804674705:test_token';
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
console.log('Bot started OK');

bot.command('start', (ctx) => {
  console.log('Start command received');
  ctx.reply('Welcome!');
});

console.log('Handlers registered');