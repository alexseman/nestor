import Joi from 'joi';

const create = Joi.object({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    group_id: Joi.number().required(),
});

const update = Joi.object({
    first_name: Joi.string(),
    last_name: Joi.string(),
    group_id: Joi.number(),
});

export default { create, update };
