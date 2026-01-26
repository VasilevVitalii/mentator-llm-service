# Docker Build Instructions

## Building the Image

**⚠️ IMPORTANT**: The Docker image supports **NVIDIA GPU (CUDA) and CPU modes only**. AMD GPU is NOT supported in the Docker version. For AMD GPU support, run the service directly on the host system.

### Prerequisites

- Docker installed and running
- Node.js 20+ (for running the build script)
- A GGUF model file (will be included in the Docker image as default model)

### Build Steps

1. **Configure build:**

   Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set required parameters:
   ```bash
   # Path to the default GGUF model that will be included in the Docker image (REQUIRED)
   DOCKER_DEFAULT_MODEL=/path/to/your/model.gguf

   # Docker image name - optional, defaults to "mentator-llm-service"
   DOCKER_IMAGE_NAME=mentator-llm-service
   ```

   **Note**: `DOCKER_DEFAULT_MODEL` is required. The build will fail if not set.

2. **Run the build script:**
   ```bash
   npm run docker:build
   ```

   This script will:
   - Check if Docker is running
   - Copy the default model into the build context
   - Build the Docker image with appropriate tags
   - Display the final image size

3. **Manual build (alternative):**
   ```bash
   # Copy your default model
   mkdir -p default-models
   cp /path/to/your/model.gguf default-models/

   # Build the image
   docker build -t mentator-llm-service:latest .
   ```

## Running the Container

Choose the appropriate command based on your hardware:

### NVIDIA GPU Mode

Requires [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) installed on the host.

```bash
docker run --rm --gpus=all \
  -v /path/to/volume:/opt/mentator-llm-service/data \
  -p 19777:19777 \
  mentator-llm-service:latest
```

The `--gpus=all` flag exposes NVIDIA GPU devices to the container. The entrypoint script detects them via `nvidia-smi` and sets `LLAMA_CUDA=1`.

### CPU Mode

If you don't have a GPU or want to use CPU only:

```bash
docker run --rm \
  -v /path/to/volume:/opt/mentator-llm-service/data \
  -p 19777:19777 \
  mentator-llm-service:latest
```

Without GPU device flags, the container runs in CPU mode.

## Volume Structure

The `/opt/mentator-llm-service/data` volume contains:
- `mentator-llm-service.conf.jsonc` - Configuration file (auto-generated on first run)
- `mentator-llm-service.db` - SQLite database
- `models/` - GGUF model files

On first run, the default model (`qwen2.5-0.5b-instruct-q8_0.gguf`) is copied to the `models/` directory if it's empty.

## Additional Options

Add `--restart unless-stopped` to automatically restart the container:
```bash
docker run --rm --restart unless-stopped --gpus=all \
  -v /path/to/volume:/opt/mentator-llm-service/data \
  -p 19777:19777 \
  mentator-llm-service:latest
```

## Accessing the Service

Once running, access the web interface at: http://localhost:19777
