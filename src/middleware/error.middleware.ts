import { Request, Response } from 'express';
import HttpException from '@/utils/exceptions/http.exception';

function errorMiddleware(
    error: HttpException,
    req: Request,
    res: Response
): void {
    const status: number = error.status || 500;
    const message: string = error.message || 'Something went wrong';

    res.setHeader('Content-Type', 'application/json').status(status).json({
        success: false,
        status,
        message,
    });
}

export default errorMiddleware;
