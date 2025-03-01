FROM node:22-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and config files
COPY tsconfig.json ./
COPY src/ ./src/

# Build the application
RUN npm run build

# Expose the port (Railway automatically sets PORT env var)
ENV PORT=9999
EXPOSE $PORT

# Start the server
CMD ["node", "dist/cli/index.js", "start"]