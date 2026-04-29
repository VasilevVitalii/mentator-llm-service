# Example: plain text response

Send a prompt and get a plain text answer (no JSON schema, no grammar).

```bash
curl -X POST http://localhost:19777/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-0.5b-instruct-q5_k_m.gguf",
    "message": {
      "user": "What is the capital of France?"
    },
    "durationMsec": 30000,
    "options": {
      "temperature": 0.8,
      "topP": 0.9,
      "topK": 40,
      "minP": 0,
      "maxTokens": 128,
      "repeatPenalty": 1.1,
      "repeatPenaltyNum": 64,
      "presencePenalty": 0,
      "frequencyPenalty": 1.1,
      "mirostat": 0,
      "mirostatTau": 5,
      "mirostatEta": 0.1,
      "penalizeNewline": true,
      "stopSequences": [],
      "trimWhitespace": true,
      "tokenBias": {},
      "evaluationPriority": 5,
      "contextShiftSize": 0,
      "disableContextShift": false
    }
  }'
```

**Response:**

```json
{
  "duration": {
    "promptMsec": 812,
    "queueMsec": 0
  },
  "result": {
    "loadModelStatus": "exists",
    "data": "The capital of France is Paris."
  }
}
```
