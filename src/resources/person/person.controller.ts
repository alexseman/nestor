import { NextFunction, Request, Response, Router } from 'express';
import Controller from '../../utils/abstractions/controller.interface.js';
import entityIdIsInt from '../../middleware/entityIdIsInt.middleware.js';
import validationMiddleware from '../../middleware/validation.middleware.js';
import ApiRequest from '../../utils/types/apiRequest.type.js';
import ApiResponse from '../../utils/apiResponse.js';
import validate from './person.validation.js';
import PersonRepository from './person.repository.js';

class PersonController implements Controller {
    public path = '/persons';
    public router = Router();
    private personRepository: PersonRepository = new PersonRepository();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get(
            `${this.path}/groups-above/:id`,
            entityIdIsInt,
            this.groupsAbove
        );
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
            ApiResponse.respond(res, 201, above);
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
            const created = await this.personRepository.create({
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                job_title: req.body.job_title,
                group_id: req.body.group_id,
            });
            ApiResponse.respond(res, 201, created);
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
                job_title: req.body.job_title,
                group_id: req.body.group_id,
            });
            ApiResponse.respond(res, 200, updated);
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
            ApiResponse.respond(
                res,
                200,
                `Successfully deleted person ${req.id}`
            );
        } catch (e) {
            next(e);
        }
    };
}

export default PersonController;
