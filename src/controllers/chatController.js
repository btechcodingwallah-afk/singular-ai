const Joi = require('joi');
const config = require('../config/env');

const chatRequestSchema = Joi.object({
  model: Joi.string().default('meta/llama-3.2-11b-vision-instruct'),
  messages: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('system', 'user', 'assistant').required(),
      content: Joi.string().required(),
    }).unknown(true)
  ).min(1).required(),
  temperature: Joi.number().min(0).max(2).default(0.2),
  max_tokens: Joi.number().integer().min(1).max(8192).default(256),
  stream: Joi.boolean().default(false),
  top_p: Joi.number().min(0).max(1).optional(),
  frequency_penalty: Joi.number().min(-2).max(2).optional(),
  presence_penalty: Joi.number().min(-2).max(2).optional(),
}).unknown(true);

// Active key index retained across calls
let currentKeyIndex = 0;

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
    const keys = config.aiApiKeys && config.aiApiKeys.length > 0 ? config.aiApiKeys : [config.aiApiKey];
    const totalKeys = keys.length;
    const startIndex = currentKeyIndex % totalKeys;

    let lastStatusCode = 500;
    let lastErrorData = null;

    for (let attempt = 0; attempt < totalKeys; attempt++) {
      const keyIdx = (startIndex + attempt) % totalKeys;
      const apiKey = keys[keyIdx];
      const keyLabel = `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`;

      try {
        const response = await fetch(providerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(value),
        });

        if (response.ok) {
          currentKeyIndex = keyIdx;
          const data = await response.json();

          // Strip any internal model thinking tags (<think>...</think>) for clean, fast output
          if (data?.choices?.[0]?.message?.content) {
            data.choices[0].message.content = data.choices[0].message.content
              .replace(/<think>[\s\S]*?<\/think>/gi, '')
              .trim();
          }

          return res.status(200).json(data);
        }

        let errorData;
        try { errorData = await response.json(); } catch (e) { errorData = { message: response.statusText }; }
        const statusCode = response.status;
        lastStatusCode = statusCode;
        lastErrorData = errorData;

        console.warn(`[AI Key Failover] Key [${keyIdx + 1}/${totalKeys}] (${keyLabel}) failed with HTTP ${statusCode}:`, JSON.stringify(errorData));

        if (statusCode === 404 && JSON.stringify(errorData).toLowerCase().includes('model')) {
          return res.status(400).json({
            error: { code: 'AI_MODEL_NOT_FOUND', message: 'The requested model does not exist or is not available.', upstream_status: 404 }
          });
        }

        currentKeyIndex = (keyIdx + 1) % totalKeys;

      } catch (err) {
        console.warn(`[AI Key Failover] Key [${keyIdx + 1}/${totalKeys}] (${keyLabel}) exception: ${err.message}`);
        lastStatusCode = (err.name === 'AbortError' || err.name === 'FetchError' || err.message.includes('fetch')) ? 504 : 502;
        lastErrorData = { message: err.message };
        currentKeyIndex = (keyIdx + 1) % totalKeys;
      }
    }

    let errorCode = 'AI_PROVIDER_ERROR';
    if (lastStatusCode === 429) errorCode = 'RATE_LIMIT_EXCEEDED';
    if (lastStatusCode >= 500) errorCode = 'AI_PROVIDER_UNAVAILABLE';
    if (lastStatusCode === 504) errorCode = 'AI_PROVIDER_TIMEOUT';

    return res.status(lastStatusCode === 429 ? 429 : (lastStatusCode >= 500 ? 502 : lastStatusCode)).json({
      error: {
        code: errorCode,
        message: `All ${totalKeys} AI provider keys failed or were rate-limited.`,
        upstream_status: lastStatusCode,
        keys_tried: totalKeys,
        last_error: lastErrorData
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createChatCompletion };
