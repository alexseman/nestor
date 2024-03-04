import { NextFunction, Request, Response } from 'express';
import HttpException from '../utils/exceptions/http.exception.js';
import logger from '../utils/logger.js';
import ApiResponse from '../utils/apiResponse.js';

function errorMiddleware(
    error: HttpException,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const status: number = error.status || 500;
    const message: string = error.message || 'Something went wrong';

    logger.error(`ERROR [${status}]: ${message}`);
    ApiResponse.respond(res, status, { status, message });
}

export default errorMiddleware;
