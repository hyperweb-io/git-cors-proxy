# @isomorphic-git/cors-proxy (Modernized)

This is a modernized version of the CORS proxy for isomorphic-git, rewritten with TypeScript and Fastify.

## Project Structure

```
src/
├── cli/            # CLI functionality for starting and stopping the server
├── middleware/     # Fastify middleware for handling CORS and proxying requests
├── types/          # TypeScript declaration files
├── utils/          # Utility functions
└── index.ts        # Main entry point
```

## Development

To start the development server:

```bash
npm run dev
```

To build the project:

```bash
npm run build
```

## Usage

### As a CLI

```bash
# Start the server
npx cors-proxy start

# Start the server on a specific port
npx cors-proxy start -p 8080

# Start the server as a daemon
npx cors-proxy start -d

# Stop the server
npx cors-proxy stop
```

### As a library

```typescript
import { createServer } from '@isomorphic-git/cors-proxy';

const server = createServer({
  origin: '*',
  insecureOrigins: ['example.com']
});

server.listen({ port: 9999 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
```

## Environment Variables

- `ALLOW_ORIGIN`: The CORS origin to allow (default: '*')
- `INSECURE_HTTP_ORIGINS`: Comma-separated list of domains to use HTTP instead of HTTPS 