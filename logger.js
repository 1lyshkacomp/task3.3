// logger.js

const pino = require('pino');
const pretty = require('pino-pretty');

// Визначаємо транспорт (pino-pretty) для красивого виводу в терміналі, 
// якщо встановлена змінна оточення PRETTY_LOGGING=true
const transport = (process.env.PRETTY_LOGGING === 'true')
    ? pino.transport({
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss'
        }
    })
    : undefined;

// Ініціалізуємо логер. Якщо transport визначений, лог буде красивим, 
// інакше це буде чистий JSON, готовий до Cloud Logging.
const logger = pino({
    level: process.env.LOG_LEVEL || 'info', // Рівень логування: info, debug, error, ...
}, transport);

module.exports = logger;