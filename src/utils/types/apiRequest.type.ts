import { Request } from 'express';

type ApiRequest = Request & {
    id?: number;
    personFilters?: {
        first_name?: string;
        last_name?: string;
    };
};

export default ApiRequest;
