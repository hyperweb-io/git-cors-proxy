# @phatg/git-cors-proxy

This is a modernized TypeScript + Fastify implementation of the CORS proxy for Git operations, derived from the original [@isomorphic-git/cors-proxy](https://github.com/isomorphic-git/cors-proxy). It enables cloning and pushing Git repositories directly from the browser when using [isomorphic-git](https://isomorphic-git.org).

## Features

- **TypeScript**: Fully typed codebase for better developer experience and code quality
- **Fastify**: High-performance, low-overhead web framework
- **Security-focused**: Built-in protection against DDoS and other common attacks
- **Railway-ready**: Optimized for deployment on Railway platform
- **Git-specific**: Validates requests to ensure they're legitimate Git operations

## Installation

```sh
npm install @phatg/git-cors-proxy
```

## CLI Usage

Start proxy on default port 9999:

```sh
git-cors-proxy start
```

Start proxy on a custom port:

```sh
git-cors-proxy start -p 8080
```

Start proxy in daemon mode. It will write the PID of the daemon process to `$PWD/cors-proxy.pid`:

```sh
git-cors-proxy start -d
```

Kill the process with the PID specified in `$PWD/cors-proxy.pid`:

```sh
git-cors-proxy stop
```

## Library Usage

You can also use the proxy as a library in your own application:

```typescript
import { createServer } from '@phatg/git-cors-proxy';

const server = createServer({
  origin: '*',
  insecureOrigins: ['localhost']
});

server.listen({ port: 9999, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
```

## Configuration

### Environment Variables

- `PORT`: The port to listen on (default: 9999)
- `ALLOW_ORIGIN`: The value for the 'Access-Control-Allow-Origin' CORS header (default: '*')
- `INSECURE_HTTP_ORIGINS`: Comma-separated list of origins for which HTTP should be used instead of HTTPS (useful for local development)
- `NODE_ENV`: Set to 'production' in production environments

## Security Features

This implementation includes several security enhancements:

- **Rate Limiting**: Prevents abuse by limiting requests per client
- **Security Headers**: Uses Helmet to set secure HTTP headers
- **Improved Error Handling**: Standardized error responses with @fastify/sensible
- **Request Validation**: JSON Schema validation for all endpoints
- **Connection Timeouts**: Prevents hanging connections that could be used in attacks

## Deploying to Railway

This project is optimized for deployment on [Railway](https://railway.app/):

1. **Fork or clone this repository**

2. **Connect to Railway**:
   - Go to [Railway Dashboard](https://railway.app/)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account if not already connected
   - Select this repository

3. **Configure Environment Variables**:
   - In your Railway project, go to the "Variables" tab
   - Add the following variables:
     - `NODE_ENV`: `production`
     - `ALLOW_ORIGIN`: `*` (or your specific allowed origins)
     - `INSECURE_HTTP_ORIGINS`: Comma-separated list of domains to connect via HTTP instead of HTTPS (optional)

4. **Deploy**:
   - Railway will automatically deploy your application
   - You can view the deployment logs in the "Deployments" tab

## Development

Clone the repository and install dependencies:

```sh
git clone https://github.com/yourusername/git-cors-proxy.git
cd git-cors-proxy
npm install
```

Start the development server:

```sh
npm run dev
```

Build the project:

```sh
npm run build
```

## Testing

The project includes a comprehensive test suite:

```sh
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run type checking
npm run test:typecheck
```

## License

This work is released under [The MIT License](https://opensource.org/licenses/MIT)
