import fastify, { FastifyInstance } from "fastify";
import { registerProxyMiddleware } from "./middleware/proxy";
import { ProxyOptions } from "./utils/types";

/**
 * Create a new CORS proxy server
 * @param options Configuration options for the proxy
 * @returns A configured Fastify instance
 */
export function createServer(options: ProxyOptions = {}): FastifyInstance {
  const app = fastify({
    logger: process.env.NODE_ENV !== "production",
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
