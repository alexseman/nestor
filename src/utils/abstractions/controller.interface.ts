import { Router } from 'express';

// eslint-disable-next-line
interface Controller {
    path: string;
    router: Router;
}

export default Controller;
