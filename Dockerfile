# Use full Node.js image for node-llama-cpp compatibility
FROM node:20

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create application directory structure
RUN mkdir -p /opt/mentator-llm-service/default-models \
    && mkdir -p /opt/mentator-llm-service/data/models

WORKDIR /opt/mentator-llm-service

# Copy package files
COPY package.json package-lock.json* ./

# Install npm dependencies
# node-llama-cpp will download prebuilt binaries (including CUDA)
RUN npm install

# Copy source code and config
COPY src ./src
COPY tsconfig.json ./tsconfig.json

# Copy entrypoint script
COPY start-docker.sh ./start-docker.sh
RUN chmod +x ./start-docker.sh

# Copy default models (prepared by build script)
COPY default-models/* ./default-models/

# Expose port
EXPOSE 19777

# Volume for persistent data
VOLUME /opt/mentator-llm-service/data

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:19777/state/version || exit 1

# Set entrypoint
ENTRYPOINT ["/opt/mentator-llm-service/start-docker.sh"]
