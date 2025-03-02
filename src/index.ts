import fastify, { FastifyInstance } from "fastify";
import { registerProxyMiddleware } from "./middleware/proxy";
import { ProxyOptions } from "./utils/types";
import fastifySensible from "@fastify/sensible";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyHelmet from "@fastify/helmet";

/**
 * Create a new CORS proxy server
 * @param options Configuration options for the proxy
 * @returns A configured Fastify instance
 */
export function createServer(options: ProxyOptions = {}): FastifyInstance {
  const app = fastify({
    logger: process.env.NODE_ENV !== "production",
    // Set appropriate timeouts to prevent hanging connections
    connectionTimeout: 30000, // 30 seconds
    keepAliveTimeout: 30000, // 30 seconds
    maxRequestsPerSocket: 1000,
  });

  // Register fastify-sensible for additional utilities and improved error handling
  app.register(fastifySensible);

  // Register helmet for security headers
  app.register(fastifyHelmet, {
    // Customize CSP if needed based on your application requirements
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  });

  // Register rate limiting to prevent abuse
  app.register(fastifyRateLimit, {
    max: 100, // Maximum 100 requests
    timeWindow: "1 minute", // Per minute
    // Add a custom error handler for rate limit errors
    errorResponseBuilder: (req, context) => {
      return {
        code: 429,
        error: "Too Many Requests",
        message: `Rate limit exceeded, retry in ${context.after}`,
        date: Date.now(),
        expiresIn: context.after,
      };
    },
  });

  // Set up a custom error handler using sensible
  app.setErrorHandler((error, request, reply) => {
    // Log the error internally
    app.log.error(error);

    // Use sensible's built-in error handling
    if (reply.statusCode >= 500) {
      return reply.internalServerError();
    } else if (reply.statusCode >= 400) {
      return reply.badRequest();
    }

    return reply.internalServerError();
  });

  // Parse the INSECURE_HTTP_ORIGINS environment variable
  const insecureOrigins = (process.env.INSECURE_HTTP_ORIGINS || "")
    .split(",")
    .filter(Boolean);

  // Register the proxy middleware
  registerProxyMiddleware(app, {
    origin: process.env.ALLOW_ORIGIN || options.origin,
    insecureOrigins: options.insecureOrigins || insecureOrigins,
  });

  return app;
}

export default createServer;
