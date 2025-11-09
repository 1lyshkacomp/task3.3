// index.js (Holiday Bot - Webhook Version)

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios'); 
// const logger = require('./logger'); <-- ВИДАЛЕНО

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
        console.error("HOLIDAYS_API_KEY не встановлено. Перевірте Env Variables.");
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
    // ЗАМІНЕНО logger.info НА console.log
    console.log(`Express server is running on port ${port}. Ready for Webhook setup.`); 
});

// Обробка вхідних Webhook-запитів
app.post(webhookPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200); 
    // ЗАМІНЕНО logger.info НА console.log
    console.log(`Отримано оновлення від Telegram: ${req.body.update_id}`);
});


// --- 4. ОБРОБНИКИ КОМАНД І КЛАВІАТУРИ ---

// Обробка /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    // ЗАМІНЕНО logger.info НА console.log
    console.log(`Отримано команду /start від ${chatId}. Відправляю Reply Keyboard.`);

    const countryNames = Object.keys(COUNTRIES);
    
    // Створення коректної клавіатури-відповіді (Reply Keyboard)
    const replyMarkup = {
        keyboard: [
            [countryNames[0], countryNames[1], countryNames[2]], // Ряд 1
            [countryNames[3], countryNames[4], countryNames[5]]  // Ряд 2
        ], 
        resize_keyboard: true, 
        one_time_keyboard: false 
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
        console.log(`Користувач обрав країну: ${countryName}. Виконую запит до API.`);

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
            // ЗАМІНЕНО logger.error НА console.error
            console.error(`Помилка при запиті до AbstractAPI: ${error.message}`);
            bot.sendMessage(chatId, '❌ Виникла помилка під час отримання даних. Перевірте HOLIDAYS_API_KEY.');
        }
    }
});