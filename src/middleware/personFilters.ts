import { NextFunction, Request, Response } from 'express';
import ApiRequest from '../utils/types/apiRequest.type.js';

const personFilters = (req: ApiRequest, res: Response, next: NextFunction) => {
    req.personFilters = {};

    if (req.query.first_name && req.query.first_name.length) {
        req.personFilters.first_name = req.query.first_name as string;
    }

    if (req.query.last_name && req.query.last_name.length) {
        req.personFilters.last_name = req.query.last_name as string;
    }

    if (req.query.job_title && req.query.job_title.length) {
        req.personFilters.job_title = req.query.job_title as string;
    }

    next();
};

export default personFilters;
