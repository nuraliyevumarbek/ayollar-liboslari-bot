const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN environment variable topilmadi. Render sozlamalarida qo\'shing.');
  process.exit(1);
}

// Webhook rejimi — polling emas, chunki Web Service HTTP so'rovlarini kutadi
const bot = new TelegramBot(BOT_TOKEN);

const app = express();
app.use(express.json());

const STATUS_LABEL = {
  qabul: 'Qabul qilindi',
  yetkazilyapti: 'Yetkazilyapti',
  topshirildi: 'Topshirildi',
  bekor: 'Bekor qilindi',
};

const PAY_LABEL = {
  cash: 'Naqd',
  online: 'Click / Payme',
};

function fmtMoney(n) {
  return Number(n).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}

// Render bu manzilga "uxlab qolmasin" deb tekshiruv yuborishi mumkin
app.get('/', (req, res) => {
  res.send('Ayollar Libosi bot ishlab turibdi ✅');
});

// Telegram yangiliklarni shu manzilga yuboradi
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} portda ishga tushdi`);
});

// /start buyrug'i
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Assalomu alaykum! 👋\n\n" +
    "\"Ayollar Libosi\" rasmiy botiga xush kelibsiz.\n\n" +
    "Do'konni ochish uchun pastdagi menyu tugmasini bosing 🛍️",
  );
});

// Web App orqali yuborilgan buyurtma ma'lumotini qabul qilish
bot.on('message', (msg) => {
  if (!msg.web_app_data) return;

  let order;
  try {
    order = JSON.parse(msg.web_app_data.data);
  } catch (e) {
    console.error('Buyurtma ma\'lumotini o\'qib bo\'lmadi:', e);
    return;
  }

  const chatId = msg.chat.id;
  const customerName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ');

  // Mijozga tasdiqlash
  bot.sendMessage(
    chatId,
    `✅ Buyurtmangiz qabul qilindi!\n\nBuyurtma raqami: ${order.id}\nJami: ${fmtMoney(order.total)}\n\nTez orada siz bilan bog'lanamiz.`
  );

  // Adminga xabar
  if (ADMIN_CHAT_ID) {
    const itemsText = (order.items || [])
      .map((i) => `• ${i.name} (${i.size} / ${i.color}) x${i.qty} — ${fmtMoney(i.price * i.qty)}`)
      .join('\n');

    const adminMessage =
      `🛍️ Yangi buyurtma!\n\n` +
      `Raqami: ${order.id}\n` +
      `Mijoz: ${customerName || 'Nomaʼlum'}\n` +
      `Telefon: ${order.phone || '-'}\n` +
      `Manzil: ${order.city || ''}, ${order.district || ''}, ${order.address || ''}\n` +
      `To'lov: ${PAY_LABEL[order.payType] || order.payType || '-'}\n` +
      (order.note ? `Izoh: ${order.note}\n` : '') +
      `\nMahsulotlar:\n${itemsText}\n\n` +
      `Jami: ${fmtMoney(order.total)}\n` +
      `Holat: ${STATUS_LABEL[order.status] || order.status}`;

    bot.sendMessage(ADMIN_CHAT_ID, adminMessage).catch((e) => {
      console.error('Adminga xabar yuborishda xatolik:', e.message);
    });
  }
});
