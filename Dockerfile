FROM node:22-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build

# Expose the port (Railway automatically sets PORT env var)
ENV PORT=9999
EXPOSE $PORT

# Start the server
CMD ["node", "dist/cli/index.js", "start"]