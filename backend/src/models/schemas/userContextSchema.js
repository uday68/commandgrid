import Joi from 'joi';

export const userContextSchema = {
  switchContext: Joi.object({
    contextId: Joi.string()
      .pattern(/^(user|company|team)_\d+$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid context ID format',
        'any.required': 'Context ID is required'
      })
  })
}; 