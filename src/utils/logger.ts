import winston, { createLogger, format, transports } from 'winston';
import 'dotenv/config';

const logger = createLogger({
    exitOnError: false,
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.errors({ stack: true }),
        format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: `${process.env.PATH_LOG}/error.log`,
            level: 'error',
            format: winston.format.json(),
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        }),
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
        }),
        new winston.transports.File({
            filename: `${process.env.PATH_LOG}/info.log`,
            level: 'info',
            format: winston.format.json(),
        }),
    ],
    exceptionHandlers: [
        new transports.File({
            filename: `${process.env.PATH_LOG}/uncaught.log`,
        }),
    ],
});

export class LoggerStream {
    write(message: string) {
        logger.info(message);
    }
}

export default logger;
