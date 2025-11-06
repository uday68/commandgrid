import Joi from 'joi';

export const marketplaceSchema = {
  purchase: Joi.object({
    toolId: Joi.number()
      .integer()
      .required()
      .messages({
        'number.base': 'Tool ID must be a number',
        'number.integer': 'Tool ID must be an integer',
        'any.required': 'Tool ID is required'
      })
  }),

  review: Joi.object({
    toolId: Joi.number()
      .integer()
      .required()
      .messages({
        'number.base': 'Tool ID must be a number',
        'number.integer': 'Tool ID must be an integer',
        'any.required': 'Tool ID is required'
      }),
    rating: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .required()
      .messages({
        'number.base': 'Rating must be a number',
        'number.integer': 'Rating must be an integer',
        'number.min': 'Rating must be at least 1',
        'number.max': 'Rating must be at most 5',
        'any.required': 'Rating is required'
      }),
    comment: Joi.string()
      .max(1000)
      .allow('')
      .messages({
        'string.max': 'Comment must be at most 1000 characters'
      })
  })
}; 