const Joi = require('joi');
const config = require('../config/env');

const chatRequestSchema = Joi.object({
  model: Joi.string().required(),
  messages: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('system', 'user', 'assistant').required(),
      content: Joi.string().required(),
    }).unknown(false)
  ).min(1).required(),
  temperature: Joi.number().min(0).max(2).default(0.3),
  max_tokens: Joi.number().integer().min(1).max(8192).default(512),
  stream: Joi.boolean().default(false),
  top_p: Joi.number().min(0).max(1).optional(),
  frequency_penalty: Joi.number().min(-2).max(2).optional(),
  presence_penalty: Joi.number().min(-2).max(2).optional(),
}).unknown(false);

const createChatCompletion = async (req, res, next) => {
  try {
    const { error, value } = chatRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: error.details.map(d => d.message).join(', ') }
      });
    }

    if (value.stream) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Streaming is not supported at this time.' }
      });
    }

    const providerUrl = `${config.aiBaseUrl.replace(/\/+$/, '')}/chat/completions`;
    
    const response = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.aiApiKey}`,
      },
      body: JSON.stringify(value),
    });

    if (!response.ok) {
      let errorData;
      try { errorData = await response.json(); } catch (e) { errorData = { message: response.statusText }; }
      
      const statusCode = response.status;
      let errorCode = 'AI_PROVIDER_ERROR';
      if (statusCode === 429) errorCode = 'RATE_LIMIT_EXCEEDED';
      if (statusCode >= 500) errorCode = 'AI_PROVIDER_UNAVAILABLE';

      return res.status(statusCode === 429 ? 429 : 502).json({
        error: { code: errorCode, message: 'Unable to generate a response at this time.' }
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'FetchError' || error.message.includes('fetch')) {
       return res.status(504).json({
         error: { code: 'AI_PROVIDER_TIMEOUT', message: 'The AI provider took too long to respond.' }
       });
    }
    next(error);
  }
};

module.exports = { createChatCompletion };
