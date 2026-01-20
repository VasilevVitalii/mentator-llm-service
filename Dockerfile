# Stage 1: Builder
FROM node:20 AS builder

# Install build tools and dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /build

# Copy package files
COPY package.json package-lock.json* ./

# Install npm dependencies
# node-llama-cpp will download/compile binaries as needed
RUN npm install

# Copy source code
COPY . .

# Build TypeScript project
RUN npm run buildjs

# Stage 2: Runtime
FROM node:20-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create application directory structure
RUN mkdir -p /opt/mentator-llm-service/default-models \
    && mkdir -p /opt/mentator-llm-service/data/models

WORKDIR /opt/mentator-llm-service

# Copy built application from builder
COPY --from=builder /build/distjs ./distjs
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json ./package.json
COPY --from=builder /build/src/static ./src/static

# Copy entrypoint script
COPY start-docker.sh /opt/mentator-llm-service/start-docker.sh
RUN chmod +x /opt/mentator-llm-service/start-docker.sh

# Copy default models (prepared by build script)
COPY default-models/* /opt/mentator-llm-service/default-models/

# Expose port
EXPOSE 19777

# Volume for persistent data
VOLUME /opt/mentator-llm-service/data

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:19777/state/version || exit 1

# Set entrypoint
ENTRYPOINT ["/opt/mentator-llm-service/start-docker.sh"]
