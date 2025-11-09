// index.js (Holiday Bot - Webhook Version)

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios'); 
const logger = require('./logger'); // <--- МОДУЛЬ ЗНАЙДЕНО!

// --- 1. КОНФІГУРАЦІЯ ---
const token = process.env.BOT_TOKEN;
const API_KEY = process.env.HOLIDAYS_API_KEY; 
const port = process.env.PORT || 8080; 
const webhookPath = '/bot/' + token; 

// Список країн та їх кодів для кнопок
const COUNTRIES = {
    '🇺🇸 США': 'US',
    '🇬🇧 UK': 'GB',
    '🇨🇦 Канада': 'CA',
    '🇺🇦 Україна': 'UA',
    '🇩🇪 Німеччина': 'DE',
    '🇫🇷 Франція': 'FR'
};

// --- 2. ДОПОМІЖНІ ФУНКЦІЇ API ---

function getTodayDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return { year: yyyy, month: mm, day: dd };
}

async function getTodayHolidays(countryCode) {
    if (!API_KEY) {
        logger.error("HOLIDAYS_API_KEY не встановлено.");
        throw new Error('API Key не встановлено.');
    }
    
    const date = getTodayDate();
    const url = 'https://holidays.abstractapi.com/v1/';
    
    const params = {
        api_key: API_KEY,
        country: countryCode,
        year: date.year,
        month: date.month,
        day: date.day
    };

    const response = await axios.get(url, { params });
    return response.data;
}

// --- 3. ІНІЦІАЛІЗАЦІЯ БОТА ТА СЕРВЕРА ---

const bot = new TelegramBot(token); 
const app = express();
app.use(express.json());

// Запуск сервера Express
app.listen(port, () => {
    logger.info('Express server is running on port %d. Ready for Webhook setup.', port);
});

// Обробка вхідних Webhook-запитів
app.post(webhookPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200); 
    logger.info({ updateId: req.body.update_id }, "Отримано оновлення від Telegram");
});


// --- 4. ОБРОБНИКИ КОМАНД І КЛАВІАТУРИ ---

// Обробка /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    logger.info({ chatId, command: '/start' }, "Отримано команду /start. Відправляю Reply Keyboard.");

    const countryNames = Object.keys(COUNTRIES);
    
    // Створення коректної клавіатури-відповіді (Reply Keyboard)
    const replyMarkup = {
        keyboard: [
            [countryNames[0], countryNames[1], countryNames[2]], // Ряд 1
            [countryNames[3], countryNames[4], countryNames[5]]  // Ряд 2
        ], 
        resize_keyboard: true, 
        one_time_keyboard: false // <--- КОМА ВИДАЛЕНА, ЩОБ УНИКНУТИ SYNTAX ERROR
    };

    bot.sendMessage(chatId, "🌍 Оберіть країну, щоб дізнатися, яке сьогодні свято:", { 
        reply_markup: replyMarkup 
    });
});


// Обробка натискання кнопки
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    const countryName = Object.keys(COUNTRIES).find(key => key === text);

    if (countryName && !text.startsWith('/')) {
        const countryCode = COUNTRIES[countryName];
        logger.info({ chatId, countryCode }, `Користувач обрав країну: ${countryName}. Виконую запит до API.`);

        try {
            bot.sendMessage(chatId, `⏳ Шукаю свята в ${countryName}...`);
            const holidayData = await getTodayHolidays(countryCode);
            
            if (holidayData.length > 0) {
                const holidaysList = holidayData
                    .map(h => `— **${h.name}** (${h.type.replace('_', ' ')})`)
                    .join('\n');
                    
                bot.sendMessage(chatId, 
                    `🎉 Сьогодні, ${getTodayDate().day}.${getTodayDate().month}, ${countryName}:\n\n${holidaysList}`,
                    { parse_mode: 'Markdown' }
                );
            } else {
                bot.sendMessage(chatId, `🧐 Сьогодні (${countryName}) немає офіційних свят.`);
            }
        } catch (error) {
            logger.error({ chatId, error: error.message }, "Помилка при запиті до AbstractAPI");
            bot.sendMessage(chatId, '❌ Виникла помилка під час отримання даних. Перевірте HOLIDAYS_API_KEY.');
        }
    }
});