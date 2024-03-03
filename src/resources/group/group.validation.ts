import Joi from 'joi';

const create = Joi.object({
    name: Joi.string().required(),
    parent_id: Joi.number().allow(null).required(),
});

const update = Joi.object({
    name: Joi.string(),
    parent_id: Joi.number(),
});

export default { create, update };
