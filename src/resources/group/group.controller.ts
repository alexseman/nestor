import { NextFunction, Request, Response, Router } from 'express';
import Controller from '../../utils/abstractions/controller.interface.js';
import GroupRepository from './group.repository.js';
import entityIdIsInt from '../../middleware/entityIdIsInt.middleware.js';
import personFilters from '../../middleware/personFilters.js';
import validationMiddleware from '../../middleware/validation.middleware.js';
import ApiRequest from '../../utils/types/apiRequest.type.js';
import ApiResponse from '../../utils/apiResponse.js';
import CacheHelper from '../../utils/cacheHelper.js';
import validate from './group.validation.js';

class GroupController implements Controller {
    public path = '/groups';
    public router = Router();
    private groupRepository: GroupRepository = new GroupRepository();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get(`${this.path}`, this.all);
        this.router.get(
            `${this.path}/subgroups/:id?`,
            [entityIdIsInt, personFilters],
            this.subGroups
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

    private subGroups = async (
        req: ApiRequest,
        res: Response,
        next: NextFunction
    ): Promise<Response | void> => {
        try {
            const subGroupsCall = () =>
                this.groupRepository.subGroupsLinear.bind(this.groupRepository)(
                    req.id,
                    req.personFilters
                );

            // do not cache filtered requests
            if (Object.values(req.personFilters).length) {
                ApiResponse.respond(res, 200, await subGroupsCall());
                return;
            }

            const subGroups = await CacheHelper.getOrSet(
                `groups:subgroups:${req.id}`,
                subGroupsCall
            );
            ApiResponse.respond(res, 200, subGroups);
        } catch (e) {
            next(e);
        }
    };

    private all = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<Response | void> => {
        try {
            const all = await CacheHelper.getOrSet(
                'groups:subgroups:all',
                this.groupRepository.all.bind(this.groupRepository)
            );
            ApiResponse.respond(res, 200, all);
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
            const updated = await this.groupRepository.update(req.id, {
                name: req.body.name,
                parent_id: req.body.parent_id,
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
            await this.groupRepository.delete(req.id);
            ApiResponse.respond(
                res,
                200,
                `Successfully deleted group ${req.id}`
            );
        } catch (e) {
            next(e);
        }
    };
}

export default GroupController;
