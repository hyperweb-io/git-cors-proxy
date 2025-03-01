FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY dist ./dist

EXPOSE 9999

CMD ["node", "dist/cli/index.js", "start"]

