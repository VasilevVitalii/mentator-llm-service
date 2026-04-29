# Tool: example-math

Performs precise mathematical calculations using `LIB.math` (JavaScript's `Math` object). Supports: `sqrt`, `pow`, `log`, `log2`, `log10`, `sin`, `cos`, `tan`, `abs`, `round`, `floor`, `ceil`, `min`, `max`, `hypot`.

Useful when the model needs accurate numeric results instead of approximating in its head.

## Setup

Place `example-math.tool.txt` in the `toolDir` configured for the service.

## Example: calculate hypotenuse of a right triangle

```bash
curl -X POST http://localhost:19777/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-0.5b-instruct-q5_k_m.gguf",
    "message": {
      "system": "You are a math assistant. Use the example-math tool for all calculations.",
      "user": "A right triangle has legs of length 7 and 24. What is the length of the hypotenuse?"
    },
    "durationMsec": 60000,
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
    "toolServer": ["example-math"]
  }'
```

**What happens internally:**

1. Model receives the prompt with the tool spec listing all supported operations and their arguments.
2. Model decides to call `example-math` with `{ "operation": "hypot", "a": 7, "b": 24 }`.
3. Service executes `LIB.math.hypot(7, 24)` → `25`.
4. Tool result is fed back to the model.
5. Model produces the final answer.

**Example tool result passed back to the model:**

```json
{ "operation": "hypot", "a": 7, "b": 24, "result": 25 }
```

**Final response from the model:**

```json
{
  "duration": { "promptMsec": 2104, "queueMsec": 0 },
  "result": {
    "loadModelStatus": "exists",
    "data": "The length of the hypotenuse is 25."
  }
}
```
