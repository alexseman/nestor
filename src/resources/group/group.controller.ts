import Controller from '@/utils/abstractions/controller.interface';
import { NextFunction, Request, Response, Router } from 'express';
import GroupRepository from '@/resources/group/group.repository';
import validate from '@/resources/group/group.validation';
import validationMiddleware from '@/middleware/validation.middleware';
import entityIdIsInt from '@/middleware/entityIdIsInt.middleware';
import ApiRequest from '@/utils/types/apiRequest.type';

class GroupController implements Controller {
    public path = '/groups';
    public router = Router();
    private groupRepository = new GroupRepository();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get(`${this.path}`, this.all);
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

    private all = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<Response | void> => {
        try {
            const all = await this.groupRepository.all();
            res.status(200).send({ success: true, data: all });
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
            const created = await this.groupRepository.create(
                req.body.name,
                req.body.parent_id
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
            const updated = await this.groupRepository.update(req.id, {
                name: req.body.name,
                parent_id: req.body.parent_id,
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
            await this.groupRepository.delete(req.id);
            res.status(200).send({ success: true });
        } catch (e) {
            next(e);
        }
    };
}

export default GroupController;
