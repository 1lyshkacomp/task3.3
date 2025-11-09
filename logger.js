// logger.js

const pino = require('pino');
const pretty = require('pino-pretty');

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

const logger = pino({
    level: process.env.LOG_LEVEL || 'info', 
}, transport);

module.exports = logger;