<div id="badges">
  <a href="https://www.linkedin.com/in/vasilev-vitalii/">
    <img src="https://img.shields.io/badge/LinkedIn-blue?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn Badge"/>
  </a>
  <a href="https://www.youtube.com/@user-gj9vk5ln5c/featured">
    <img src="https://img.shields.io/badge/YouTube-red?style=for-the-badge&logo=youtube&logoColor=white" alt="Youtube Badge"/>
  </a>
</div>

[Русский](README.rus.md)

# Mentator LLM Service

A specialized local LLM inference service that **guarantees JSON-formatted responses** using grammar-guided generation (GBNF). Built on top of [llama.cpp](https://github.com/ggerganov/llama.cpp) via [node-llama-cpp](https://github.com/withcatai/node-llama-cpp), it enables you to extract structured data from unstructured text with type-safe, schema-validated outputs.

## Key Features

- **Guaranteed JSON Schema compliance** - responses always match your defined structure using GBNF (Grammar-Based Neural Format)
- **Local inference** - full privacy and control over your data, no external API calls
- **GGUF model support** - use quantized models for efficient processing on consumer hardware
- **Simple REST API** - easy integration with any programming language or tool
- **Web UI** - interactive chat interface for testing and experimentation
- **Request queueing** - automatic handling of concurrent requests to prevent GPU/CPU overload
- **Flexible configuration** - customizable model parameters, logging, and database settings
- **Built with Bun** - fast startup and execution powered by the Bun runtime

## Why Use Mentator?

Traditional LLMs often produce inconsistent output formats, requiring complex post-processing and error handling. Mentator solves this by:

1. **Enforcing structure at generation time** - the model cannot produce invalid JSON
2. **Validating against your schema** - outputs always match your defined TypeScript/JSON Schema types
3. **Eliminating parsing errors** - no need for try-catch blocks around JSON.parse()
4. **Providing predictable APIs** - perfect for automation, data extraction, and structured AI agents

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Web Interface](#web-interface)
- [Building from Source](#building-from-source)
- [Docker Support](#docker-support)
- [License](#license)

## Installation

### Prerequisites

- [Bun](https://bun.sh/) runtime (v1.0.0 or higher)
- At least one GGUF model file (see [Downloading Models](#downloading-models))
- Minimum 8GB RAM (16GB+ recommended for larger models)

### Install Dependencies

```bash
git clone https://github.com/VasilevVitalii/mentator-llm-service.git
cd mentator-llm-service
bun install
```

### Downloading Models

You need to download GGUF model files manually. We recommend starting with:

**[Qwen2.5-Coder-7B-Instruct-Q5_K_M.gguf](https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q5_k_m.gguf)** (~5GB)

Other excellent options:
- [Llama 3.2 models](https://huggingface.co/models?library=gguf&search=llama-3.2) - great general purpose
- [Mistral models](https://huggingface.co/models?library=gguf&search=mistral) - efficient and accurate
- Browse all: [Hugging Face GGUF models](https://huggingface.co/models?library=gguf)

Place downloaded `.gguf` files in a directory of your choice (you'll specify this in the config).

## Quick Start

### 1. Generate Configuration Template

```bash
bun run src/index.ts --conf-gen /path/to/config/directory
```

This creates `mentator-llm-service.config.TEMPLATE.jsonc` with all available options and documentation.

### 2. Edit Configuration

Rename the template file and configure it:

```bash
mv mentator-llm-service.config.TEMPLATE.jsonc mentator-llm-service.config.jsonc
```

Minimal required changes:
```jsonc
{
  "port": 19777,
  "modelDir": "/path/to/your/gguf/models",  // ← Update this
  "dbFile": "/path/to/mentator-llm-service.db",  // ← Update this
  "defaultOptions": {
    "temperature": 0.0,
    "maxTokens": 4096
    // ... other generation parameters
  },
  "log": {
    "level": "debug",
    "liveDay": 30,
    "savePrompt": false
  }
}
```

### 3. Start the Service

```bash
bun run src/index.ts --conf-use /path/to/mentator-llm-service.config.jsonc
```

The service will start on the configured port (default: `http://localhost:19777`).

### 4. Test with Web UI

Open your browser and navigate to:
- **Main page**: `http://localhost:19777/` - overview and links
- **Chat interface**: `http://localhost:19777/chat` - interactive testing
- **API docs**: `http://localhost:19777/doc` - Swagger/OpenAPI documentation
- **Statistics**: `http://localhost:19777/stat` - loaded models and metrics

## Configuration

The configuration file (JSONC format) supports comments and has the following structure:

### Port
```jsonc
"port": 19777  // Port where the server will listen
```

### Model Directory
```jsonc
"modelDir": "/path/to/models"  // Directory containing .gguf files
```

The service automatically discovers all `.gguf` files in this directory.

### Database File
```jsonc
"dbFile": "/path/to/mentator-llm-service.db"  // SQLite database for logs
```

### Default Generation Options
```jsonc
"defaultOptions": {
  "temperature": 0.0,      // Randomness (0.0 = deterministic, 1.0 = creative)
  "topP": 0.1,             // Nucleus sampling threshold
  "topK": 10,              // Top-K sampling limit
  "minP": 0.0,             // Minimum probability threshold
  "maxTokens": 4096,       // Maximum response length in tokens
  "repeatPenalty": 1.0     // Penalty for repeating tokens
}
```

These defaults are merged with per-request options.

### Logging Configuration
```jsonc
"log": {
  "level": "debug",        // "error" | "debug" | "trace"
  "liveDay": 30,           // Days to keep logs in database
  "savePrompt": false      // Save full request/response text
}
```

⚠️ **Warning**: Setting `savePrompt: true` stores complete prompts and responses in the database, which can grow very large.

## Usage Examples

### Example 1: Extract Structured Data (Web UI)

1. Go to `http://localhost:19777/chat`
2. Select your model from the dropdown
3. Enter this story in "User Prompt":

```
I am Bob, I am 9 years old and I live on Sunny Street. My friend Diana lives across from me,
she is 8 years old and does gymnastics. A little further away lives my friend John, he is a
year older than me. We like to play tennis with him. We ask Mr. Smith to judge our game.
He is a former tennis referee. And although he is already 92 years old, he still loves his
former job and is happy to help us.
```

4. Add to the beginning: `Get all people (name, age, etc.) from this text:`
5. Click "FORMAT" button, enable "use grammar", and paste this schema:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "age": { "type": "integer" },
      "sex": { "type": "string", "enum": ["male", "female"] },
      "hobby": { "type": "string" }
    },
    "required": ["name", "age", "sex"]
  }
}
```

6. Close the modal (OK button)
7. Click "OPTIONS" → "SET EXAMPLE FOR JSON" → OK
8. Click "Send"

**Result**: A guaranteed valid JSON array of people with their details!

### Example 2: API Request (cURL)

```bash
curl -X POST http://127.0.0.1:19777/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-coder-7b-instruct-q5_k_m",
    "message": {
      "user": "Get all people (name, age, etc.) from this text: I am Bob, I am 9 years old and I live on Sunny Street. My friend Diana lives across from me, she is 8 years old and does gymnastics. A little further away lives my friend John, he is a year older than me. We like to play tennis with him. We ask Mr. Smith to judge our game. He is a former tennis referee. And although he is already 92 years old, he still loves his former job and is happy to help us."
    },
    "durationMsec": 30000,
    "format": {
      "useGrammar": true,
      "jsonSchema": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "age": { "type": "integer" },
            "sex": { "type": "string", "enum": ["male", "female"] },
            "hobby": { "type": "string" }
          },
          "required": ["name", "age", "sex"]
        }
      }
    }
  }'
```

**Response**:
```json
{
  "duration": {
    "promtMsec": 5234,
    "queueMsec": 0
  },
  "result": {
    "loadModelStatus": "exists",
    "data": [
      {"name": "Bob", "age": 9, "sex": "male", "hobby": "tennis"},
      {"name": "Diana", "age": 8, "sex": "female", "hobby": "gymnastics"},
      {"name": "John", "age": 10, "sex": "male", "hobby": "tennis"},
      {"name": "Mr. Smith", "age": 92, "sex": "male", "hobby": "tennis referee"}
    ]
  }
}
```

### Example 3: TypeScript/JavaScript Client

```typescript
async function extractPeople(text: string) {
  const response = await fetch('http://127.0.0.1:19777/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5-coder-7b-instruct-q5_k_m',
      message: {
        user: `Get all people (name, age, etc.) from this text: ${text}`
      },
      durationMsec: 30000,
      format: {
        useGrammar: true,
        jsonSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'integer' },
              sex: { type: 'string', enum: ['male', 'female'] },
              hobby: { type: 'string' }
            },
            required: ['name', 'age', 'sex']
          }
        }
      }
    })
  });

  const result = await response.json();
  return result.result.data;  // Typed array of people
}
```

## API Reference

### Main Endpoints

#### `POST /prompt`
Process a prompt and return structured JSON response.

**Request body**:
```typescript
{
  model: string;              // Model name (filename without .gguf)
  message: {
    system?: string;          // Optional system prompt
    user: string;             // User prompt
  };
  durationMsec: number;       // Timeout in milliseconds
  options?: {                 // Optional generation parameters
    temperature?: number;
    topP?: number;
    topK?: number;
    maxTokens?: number;
    // ... see config for all options
  };
  format?: {                  // Optional JSON formatting
    useGrammar: boolean;      // Use GBNF for grammar-guided generation
    jsonSchema: object;       // JSON Schema for validation/generation
  };
}
```

**Response** (200 OK):
```typescript
{
  duration: {
    promtMsec: number;        // Processing time
    queueMsec: number;        // Queue wait time
  };
  result: {
    loadModelStatus: "load" | "exists";  // Model load status
    data: any;                // Structured response matching your schema
  };
}
```

**Response** (400/500 Error):
```typescript
{
  duration: {
    promtMsec: number;
    queueMsec: number;
  };
  error: string;              // Error description
}
```

### Validation Endpoints

#### `POST /check/gbnf`
Validate GBNF grammar syntax.

#### `POST /check/jsonresponse`
Validate JSON Schema structure.

#### `POST /check/options`
Validate and complete generation options.

### Information Endpoints

#### `GET /state`
Get current service state (loaded models, queue status).

#### `GET /state/models`
List all available models in the model directory.

#### `GET /state/version`
Get service version.

### Log Endpoints

#### `GET /log/core/bydate`
Get core logs by date range.

#### `GET /log/chat/bydate`
Get chat/prompt logs by date range.

See full API documentation at `http://localhost:19777/doc` (Swagger UI).

## Web Interface

The service provides several web pages:

- **/** - Main page with service overview and examples
- **/chat** - Interactive chat interface for testing prompts
- **/doc** - Swagger/OpenAPI API documentation
- **/stat** - Statistics dashboard with loaded models and metrics
- **/log/core** - Core service operation logs
- **/log/chat** - Request/response logs for prompts

## Building from Source

### Build Executable (Bun)

Build a standalone executable for your platform:

```bash
# Linux
bun run build:linux
# Output: dist/mentator-llm-service

# Windows
bun run build:win
# Output: dist/mentator-llm-service.exe
```

The executable includes the Bun runtime and all dependencies.

### Build JavaScript (Node.js compatibility)

```bash
bun run buildjs
```

Output in `distjs/` directory can be run with Node.js.

## Docker Support

*Docker support is planned. See [todo.md](todo.md) for roadmap.*

## Troubleshooting

### Model not loading
- Ensure the `.gguf` file is in the configured `modelDir`
- Check file permissions (service needs read access)
- Verify you have enough RAM (8GB minimum, 16GB+ recommended)

### Slow responses
- Use smaller quantized models (Q4_K_M or Q5_K_M)
- Reduce `maxTokens` in generation options
- Check CPU/GPU usage during inference

### JSON Schema errors
- Test your schema at `http://localhost:19777/doc` using `/check/jsonresponse`
- Ensure schema is valid per [JSON Schema spec](https://json-schema.org/)
- Complex schemas may reduce generation speed

### Out of memory
- Use more quantized models (Q2, Q3, Q4 instead of Q5, Q6, Q8)
- Reduce `maxTokens`
- Close other applications

## Performance Tips

1. **Choose the right quantization**: Q5_K_M offers the best quality/size tradeoff
2. **Use temperature 0.0** for deterministic outputs
3. **Set appropriate maxTokens** - don't generate more than needed
4. **Monitor queue times** - high queue times indicate you need more hardware or smaller models
5. **Enable logging selectively** - `savePrompt: false` keeps database size manageable

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Vitalii Vasilevich
- LinkedIn: [vasilev-vitalii](https://www.linkedin.com/in/vasilev-vitalii/)
- YouTube: [@user-gj9vk5ln5c](https://www.youtube.com/@user-gj9vk5ln5c/featured)

## Related Projects

- [node-llama-cpp](https://github.com/withcatai/node-llama-cpp) - Node.js bindings for llama.cpp
- [llama.cpp](https://github.com/ggerganov/llama.cpp) - LLM inference in C++
- [vv-ai-prompt-format](https://www.npmjs.com/package/vv-ai-prompt-format) - Prompt formatting utilities
