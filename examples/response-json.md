# Example: structured JSON response

Send a prompt with a JSON Schema to get a guaranteed structured response.

```bash
curl -X POST http://localhost:19777/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-0.5b-instruct-q5_k_m.gguf",
    "message": {
      "user": "Get all people from this text: Bob is 9 years old and plays tennis. Diana is 8 and does gymnastics."
    },
    "durationMsec": 30000,
    "options": {
      "temperature": 0,
      "topP": 0.1,
      "topK": 10,
      "minP": 0,
      "maxTokens": 4096,
      "repeatPenalty": 1,
      "repeatPenaltyNum": 0,
      "presencePenalty": 0,
      "frequencyPenalty": 0,
      "mirostat": 0,
      "mirostatTau": 5,
      "mirostatEta": 0.1,
      "penalizeNewline": false,
      "stopSequences": [],
      "trimWhitespace": true,
      "tokenBias": {},
      "evaluationPriority": 5,
      "contextShiftSize": 0,
      "disableContextShift": false
    },
    "format": {
      "useGrammar": true,
      "jsonSchema": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name":  { "type": "string" },
            "age":   { "type": "integer" },
            "hobby": { "type": "string" }
          },
          "required": ["name", "age"]
        }
      }
    }
  }'
```

**Response:**

```json
{
  "duration": {
    "promptMsec": 1543,
    "queueMsec": 0
  },
  "result": {
    "loadModelStatus": "exists",
    "data": [
      { "name": "Bob",   "age": 9, "hobby": "tennis" },
      { "name": "Diana", "age": 8, "hobby": "gymnastics" }
    ]
  }
}
```
