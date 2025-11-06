const Joi = require('joi');

const aiAssistantSchema = {
  message: Joi.object({
    input: Joi.string().required().max(1000).messages({
      'string.empty': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 1000 characters',
      'any.required': 'Message is required'
    }),
    context: Joi.object().default({})
  }),

  preferences: Joi.object({
    preferences: Joi.object({
      language: Joi.string().valid('en', 'es', 'fr', 'de').default('en'),
      tone: Joi.string().valid('professional', 'casual', 'technical').default('professional'),
      notificationFrequency: Joi.string().valid('immediate', 'daily', 'weekly').default('immediate'),
      autoSuggestions: Joi.boolean().default(true),
      maxSuggestions: Joi.number().min(1).max(10).default(5),
      customContext: Joi.object().default({})
    }).required()
  }),

  session: Joi.object({
    context: Joi.object({
      userRole: Joi.string(),
      activeIntegrations: Joi.array().items(Joi.string()),
      projectContext: Joi.object(),
      customContext: Joi.object()
    }).default({})
  })
};

module.exports = aiAssistantSchema; 