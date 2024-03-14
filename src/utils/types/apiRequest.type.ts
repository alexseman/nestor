import { Request } from 'express';

type ApiRequest = Request & {
    id?: number;
    personFilters?: {
        first_name?: string;
        last_name?: string;
        job_title?: string;
    };
};

export default ApiRequest;
