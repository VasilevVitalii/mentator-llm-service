# Tool: example-fs-path

Scans a directory and returns a list of entries with details: name, extension, size in bytes, whether it is a directory, and full path. Optionally filters by file extension.

Uses `LIB.fs` (readdirSync, statSync) and `LIB.path` (join, extname).

## Setup

Place `example-fs-path.tool.txt` in the `toolDir` configured for the service.

## Example: list all JavaScript files in a directory

```bash
curl -X POST http://localhost:19777/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-0.5b-instruct-q5_k_m.gguf",
    "message": {
      "system": "You are a helpful assistant. When asked about files, use the example-fs-path tool to get real data and then summarize results.",
      "user": "List all .js files in /home/user/project/src and tell me which one is the largest."
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
    "toolServer": ["example-fs-path"]
  }'
```

**What happens internally:**

1. Model receives the prompt together with the tool spec describing `dir` and optional `extension` arguments.
2. Model decides to call `example-fs-path` with `{ "dir": "/home/user/project/src", "extension": ".js" }`.
3. Service executes the tool code — reads the directory, filters by `.js`, collects stats.
4. Tool result (array of file entries) is fed back to the model.
5. Model produces a final text answer summarizing which file is the largest.

**Example tool result passed back to the model:**

```json
[
  { "name": "index.js",  "extension": ".js", "sizeByte": 4210,  "isDirectory": false, "fullPath": "/home/user/project/src/index.js" },
  { "name": "utils.js",  "extension": ".js", "sizeByte": 8934,  "isDirectory": false, "fullPath": "/home/user/project/src/utils.js" },
  { "name": "server.js", "extension": ".js", "sizeByte": 12780, "isDirectory": false, "fullPath": "/home/user/project/src/server.js" }
]
```

**Final response from the model:**

```json
{
  "duration": { "promptMsec": 3241, "queueMsec": 0 },
  "result": {
    "loadModelStatus": "exists",
    "data": "There are 3 JavaScript files in /home/user/project/src. The largest is server.js at 12,780 bytes."
  }
}
```
