# VeerNXT AI API Proxy

This is a stateless, secure backend proxy API that forwards chat completion requests to the AI model (`nvidia/nemotron-3.5-lightning-30b-a3b`).

It does **not** include RAG, vector databases, or any business logic. Its sole purpose is to securely expose the AI model to the backend systems while hiding the AI provider's credentials.

## Authentication
This API is protected. You must include the `Authorization` header with a Bearer token matching the `INTERNAL_API_KEY` configured in the `.env` file.

```http
Authorization: Bearer developergupta_GWWN4LCOUOAKz16hF439MUGnf1PPKonBnpARki6xHPDbEnNjR
```

## Endpoints

### 1. Health Check
**GET** `/api/v1/health`

**Response (200 OK)**:
```json
{ "status": "ok" }
```

### 2. Chat Completions
**POST** `/api/v1/chat/completions`

Generates a response using the configured AI provider.

**Request Payload**:
```json
{
  "model": "nvidia/nemotron-3.5-lightning-30b-a3b",
  "messages": [
    { "role": "system", "content": "You are the VeerNXT AI assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "temperature": 0.3,
  "max_tokens": 512,
  "stream": false
}
```

**Success Response (200 OK)**:
```json
{
  "id": "chatcmpl_xxxxx",
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": { "role": "assistant", "content": "..." },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 }
}
```

## Error Handling
The API returns a consistent JSON structure on errors, ensuring internal provider errors and stack traces are not leaked.

```json
{
  "error": {
    "code": "AI_PROVIDER_ERROR",
    "message": "Unable to generate a response at this time."
  }
}
```
