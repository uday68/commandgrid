const Joi = require('joi');

const integrationSchema = {
  connect: Joi.object({
    credentials: Joi.object({
      access_token: Joi.string().required(),
      refresh_token: Joi.string(),
      token_type: Joi.string(),
      expires_in: Joi.number(),
      scope: Joi.string(),
      // Add other credential fields as needed
    }).required(),
  }),

  status: Joi.object({
    status: Joi.string().valid('connected', 'disconnected', 'error').required(),
    details: Joi.string(),
  }),

  // Add more schemas as needed for other integration operations
};

module.exports = integrationSchema; 