#!/bin/bash
set -e

echo "=== Mentator LLM Service Docker Startup ==="

# Step 1: Copy default models if models directory is empty
MODELS_DIR="/opt/mentator-llm-service/data/models"
DEFAULT_MODELS_DIR="/opt/mentator-llm-service/default-models"

if [ ! -d "$MODELS_DIR" ]; then
    echo "Creating models directory: $MODELS_DIR"
    mkdir -p "$MODELS_DIR"
fi

if [ -z "$(ls -A "$MODELS_DIR")" ]; then
    echo "Models directory is empty, copying default models..."
    if [ -d "$DEFAULT_MODELS_DIR" ] && [ -n "$(ls -A "$DEFAULT_MODELS_DIR")" ]; then
        cp -v "$DEFAULT_MODELS_DIR"/* "$MODELS_DIR"/
        echo "Default models copied successfully"
    else
        echo "Warning: No default models found in $DEFAULT_MODELS_DIR"
    fi
else
    echo "Models directory already contains files, skipping default models copy"
fi

# Step 2: Detect GPU hardware and set environment variables
GPU_BACKEND="cpu"

# Check for NVIDIA GPU
if command -v nvidia-smi &> /dev/null; then
    if nvidia-smi &> /dev/null; then
        GPU_BACKEND="cuda"
        export LLAMA_CUDA=1
        echo "✓ NVIDIA GPU detected"
        nvidia-smi --query-gpu=name,memory.total --format=csv,noheader | while read line; do
            echo "  GPU: $line"
        done
    fi
fi

# Check for AMD GPU (only if NVIDIA not found)
if [ "$GPU_BACKEND" = "cpu" ]; then
    # Check for ROCm tools
    if command -v rocm-smi &> /dev/null; then
        if rocm-smi &> /dev/null; then
            GPU_BACKEND="rocm"
            export LLAMA_HIPBLAS=1
            echo "✓ AMD GPU detected (ROCm)"
            rocm-smi --showproductname || echo "  AMD GPU present"
        fi
    # Fallback: check for AMD GPU devices
    elif [ -e /dev/kfd ] && [ -e /dev/dri ]; then
        GPU_BACKEND="rocm"
        export LLAMA_HIPBLAS=1
        echo "✓ AMD GPU detected (device files present)"
    fi
fi

# CPU fallback
if [ "$GPU_BACKEND" = "cpu" ]; then
    echo "ℹ No GPU detected, using CPU mode"
fi

echo "Selected backend: $GPU_BACKEND"
echo ""

# Step 3: Start the application
echo "Starting Mentator LLM Service..."
exec npx tsx /opt/mentator-llm-service/src/index.ts --conf-docker /opt/mentator-llm-service/data/mentator-llm-service.conf.jsonc
