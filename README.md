# @isomorphic-git/cors-proxy

This is the software running on https://cors.isomorphic-git.org/ -
a free service (generously sponsored by [Clever Cloud](https://www.clever-cloud.com/?utm_source=ref&utm_medium=link&utm_campaign=isomorphic-git))
for users of [isomorphic-git](https://isomorphic-git.org) that enables cloning and pushing repos in the browser.

It is derived from https://github.com/wmhilton/cors-buster with added restrictions to reduce the opportunity to abuse the proxy.
Namely, it blocks requests that don't look like valid git requests.

## Installation

```sh
npm install @isomorphic-git/cors-proxy
```

## CLI usage

Start proxy on default port 9999:

```sh
cors-proxy start
```

Start proxy on a custom port:

```sh
cors-proxy start -p 9889
```

Start proxy in daemon mode. It will write the PID of the daemon process to `$PWD/cors-proxy.pid`:

```sh
cors-proxy start -d
```

Kill the process with the PID specified in `$PWD/cors-proxy.pid`:

```sh
cors-proxy stop
```

### CLI configuration

Environment variables:
- `PORT` the port to listen to (if run with `npm start`)
- `ALLOW_ORIGIN` the value for the 'Access-Control-Allow-Origin' CORS header
- `INSECURE_HTTP_ORIGINS` comma separated list of origins for which HTTP should be used instead of HTTPS (added to make developing against locally running git servers easier)


## Middleware usage

You can also use the `cors-proxy` as a middleware in your own server.

```js
const express = require('express')
const corsProxy = require('@isomorphic-git/cors-proxy/middleware.js')

const app = express()
const options = {}

app.use(corsProxy(options))

```

### Middleware configuration

*The middleware doesn't use the environment variables.* The options object supports the following properties:

- `origin`: _string_. The value for the 'Access-Control-Allow-Origin' CORS header
- `insecure_origins`: _string[]_. Array of origins for which HTTP should be used instead of HTTPS (added to make developing against locally running git servers easier)
- `authorization`: _(req, res, next) => void_. A middleware function you can use to handle custom authorization. Is run after filtering for git-like requests and handling CORS but before the request is proxied.

_Example:_
```ts
app.use(
  corsProxy({
    authorization: (req: Request, res: Response, next: NextFunction) => {
      // proxied git HTTP requests already use the Authorization header for git credentials,
      // so their [Company] credentials are inserted in the X-Authorization header instead.
      if (getAuthorizedUser(req, 'X-Authorization')) {
        return next();
      } else {
        return res.status(401).send("Unable to authenticate you with [Company]'s git proxy");
      }
    },
  })
);

// Only requests with a valid JSON Web Token will be proxied
function getAuthorizedUser(req: Request, header: string = 'Authorization') {
  const Authorization = req.get(header);

  if (Authorization) {
    const token = Authorization.replace('Bearer ', '');
    try {
      const verifiedToken = verify(token, env.APP_SECRET) as IToken;
      if (verifiedToken) {
        return {
          id: verifiedToken.userId,
        };
      }
    } catch (e) {
      // noop
    }
  }
}
```

## Installation on Kubernetes

There is no official chart for this project, helm or otherwise. You can make your own, but keep in mind cors-proxy uses the Micro server, which will return a 403 error for any requests that do not have the user agent header.

_Example:_
```yaml
  containers:
      - name: cors-proxy
        image: node:lts-alpine
        env:
        - name: ALLOW_ORIGIN
          value: https://mydomain.com
        command:
        - npx
        args:
        - '@isomorphic-git/cors-proxy'
        - start
        ports:
        - containerPort: 9999
          hostPort: 9999
          name: proxy
          protocol: TCP
        livenessProbe:
          tcpSocket:
            port: proxy
        readinessProbe:
          tcpSocket:
            port: proxy
```

## Deploying to Railway

This project is ready to be deployed to [Railway](https://railway.app/), a modern platform for deploying applications.

### Prerequisites

- A Railway account
- Git repository with your code

### Deployment Steps

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
   - Railway will automatically deploy your application using the Dockerfile
   - You can view the deployment logs in the "Deployments" tab

5. **Custom Domain (Optional)**:
   - In your Railway project, go to the "Settings" tab
   - Under "Domains", add your custom domain
   - Configure DNS records as instructed

### Railway-Specific Configuration

This project includes several Railway-specific configurations:

1. **Host Configuration**: 
   - The server is configured to listen on `::` in production environments, which is required by Railway
   - This allows the app to be available over both public and private networks

2. **Port Configuration**:
   - The application automatically uses the `PORT` environment variable provided by Railway
   - A fallback to port 9999 is used for local development

3. **Health Check Endpoint**:
   - A `/health` endpoint is provided for Railway's health checks
   - This ensures Railway can monitor the application's status

4. **Docker Configuration**:
   - The Dockerfile is optimized for Railway deployment
   - It uses the `PORT` environment variable for exposing the correct port

### Troubleshooting Deployment

If you encounter build issues:
- Check the deployment logs for specific error messages
- Ensure the `tsconfig.json` file is properly included in your repository
- Verify that all dependencies are correctly listed in `package.json`
- Try redeploying after making changes

If you see 502 errors:
- Verify that the server is listening on `::` host in production
- Check that the health check endpoint is responding correctly
- Review the application logs for any startup errors

### Monitoring

Railway provides built-in monitoring and logging:
- Use the "Metrics" tab to monitor resource usage
- Use the "Logs" tab to view application logs

## License

This work is released under [The MIT License](https://opensource.org/licenses/MIT)

## Testing

The project includes a comprehensive test suite for the TypeScript implementation. The tests are located in the `src/tests` directory and are organized to mirror the structure of the source code.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run type checking
npm run test:typecheck
```

### Test Coverage

The tests cover the following functionality:

- **Request Filtering**: Tests for the `allowRequest` function that validates Git-specific requests
- **Proxy Middleware**: Tests for the CORS proxy middleware that handles request forwarding
- **Server Configuration**: Tests for the server creation and configuration
- **Environment Variables**: Tests for the handling of environment variables for configuration

### Test Utilities

The test suite includes utilities to make testing easier:

- **Mock Fastify**: A factory function for creating mock Fastify instances
- **Test Setup**: Common setup for all tests

For more details, see the [tests README](src/tests/README.md).
