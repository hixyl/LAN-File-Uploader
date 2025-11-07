const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const { LOG_DIR } = require('./config');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Define log format
const logFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message}`;
    
    // Append metadata if it exists
    const meta = metadata.metadata; // Nesting is due to how winston formats
    if (meta && Object.keys(meta).length) {
        msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
});

const logger = winston.createLogger({
    level: 'info', // Logger 的最低级别：info 及以上都会被处理
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.metadata(), // Gathers metadata
        logFormat
    ),
    transports: [
        // Console transport
        new winston.transports.Console({
            level: 'warn', // *** 修改点：只在控制台打印 'warn' 和 'error' 级别的日志 ***
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        // File transport for all logs (info 及以上)
        new winston.transports.DailyRotateFile({
            level: 'info', // 确保 info 级别被写入文件
            filename: path.join(LOG_DIR, 'server-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        }),
        // File transport for error logs
        new winston.transports.File({
            level: 'error',
            filename: path.join(LOG_DIR, 'error.log'),
        })
    ],
    exitOnError: false
});

module.exports = logger;