import { NextFunction, Response } from 'express';
import ApiRequest from '@/utils/types/apiRequest.type';
import HttpException from '@/utils/exceptions/http.exception';

const entityIdIsInt = (req: ApiRequest, res: Response, next: NextFunction) => {
    // @ts-ignore
    if (req.params.id && req.params.id % 1 === 0) {
        req.id = Number(req.params.id);
        return next();
    }

    throw new HttpException(400, 'Entity id is not an integer');
};

export default entityIdIsInt;
