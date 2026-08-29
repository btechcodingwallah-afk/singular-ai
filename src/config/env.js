require('dotenv').config();
const Joi = require('joi');

const envSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  AI_API_KEY: Joi.string().required().description('API Key for the upstream AI provider'),
  AI_BASE_URL: Joi.string().uri().required().description('Base URL for the upstream AI provider (e.g., https://api.openai.com/v1)'),
  INTERNAL_API_KEY: Joi.string().required().description('API Key to authenticate clients consuming this proxy API'),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  port: envVars.PORT,
  env: envVars.NODE_ENV,
  aiApiKey: envVars.AI_API_KEY,
  aiBaseUrl: envVars.AI_BASE_URL,
  internalApiKey: envVars.INTERNAL_API_KEY,
};
