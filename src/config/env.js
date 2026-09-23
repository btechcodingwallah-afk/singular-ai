require('dotenv').config();
const Joi = require('joi');

const envSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  AI_API_KEY: Joi.string().optional().description('API Key for the upstream AI provider'),
  AI_API_KEYS: Joi.string().optional().description('Comma-separated API Keys for upstream AI provider failover'),
  AI_BASE_URL: Joi.string().uri().required().description('Base URL for the upstream AI provider (e.g., https://api.openai.com/v1)'),
  INTERNAL_API_KEY: Joi.string().required().description('API Key to authenticate clients consuming this proxy API'),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const rawKeys = envVars.AI_API_KEYS || envVars.AI_API_KEY || '';
const aiApiKeys = rawKeys.split(/[\n,;]+/).map(k => k.trim()).filter(k => k.length > 10);

if (aiApiKeys.length === 0) {
  throw new Error('Config validation error: At least one AI API key must be provided in AI_API_KEYS or AI_API_KEY');
}

module.exports = {
  port: envVars.PORT,
  env: envVars.NODE_ENV,
  aiApiKey: aiApiKeys[0],
  aiApiKeys,
  aiBaseUrl: envVars.AI_BASE_URL,
  internalApiKey: envVars.INTERNAL_API_KEY,
};
