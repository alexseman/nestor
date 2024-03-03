import Controller from '@/utils/abstractions/controller.interface';
import { NextFunction, Request, Response, Router } from 'express';
import personRepository from '@/resources/person/person.repository';
import validate from '@/resources/person/person.validation';
import validationMiddleware from '@/middleware/validation.middleware';
import entityIdIsInt from '@/middleware/entityIdIsInt.middleware';
import ApiRequest from '@/utils/types/apiRequest.type';

class PersonController implements Controller {
    public path = '/Persons';
    public router = Router();
    private personRepository = new personRepository();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get(`${this.path}/groups-above/:id`, entityIdIsInt, this.groupsAbove);
        this.router.post(
            `${this.path}`,
            validationMiddleware(validate.create),
            this.create
        );
        this.router.patch(
            `${this.path}/:id`,
            [entityIdIsInt, validationMiddleware(validate.update)],
            this.update
        );
        this.router.delete(`${this.path}/:id`, entityIdIsInt, this.delete);
    }

    private groupsAbove = async (
        req: ApiRequest,
        res: Response,
        next: NextFunction
    ): Promise<Response | void> => {
        try {
            const above = await this.personRepository.groupsAbove(req.id);
            res.status(200).send({ success: true, data: above });
        } catch (e) {
            next(e);
        }
    };

    private create = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<Response | void> => {
        try {
            const created = await this.personRepository.create(
                req.body.first_name,
                req.body.last_name,
                req.body.group_id
            );
            res.status(201).send({ success: true, data: { ...created } });
        } catch (e) {
            next(e);
        }
    };

    private update = async (
        req: ApiRequest,
        res: Response,
        next: NextFunction
    ): Promise<Response | void> => {
        try {
            const updated = await this.personRepository.update(req.id, {
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                group_id: req.body.group_id,
            });
            res.status(200).send({ success: true, data: { ...updated } });
        } catch (e) {
            next(e);
        }
    };

    private delete = async (
        req: ApiRequest,
        res: Response,
        next: NextFunction
    ): Promise<Response | void> => {
        try {
            await this.personRepository.delete(req.id);
            res.status(200).send({ success: true });
        } catch (e) {
            next(e);
        }
    };
}

export default PersonController;