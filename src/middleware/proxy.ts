import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from "fastify";
import { URL } from "url";
import fetch from "node-fetch";
import { allowRequest } from "../utils/allow-request";
import { ParsedUrl, ProxyOptions, RequestWithParsedUrl } from "../utils/types";
import fastifyCors from "@fastify/cors";

// Headers allowed in requests to the proxy
const allowHeaders = [
  "accept-encoding",
  "accept-language",
  "accept",
  "access-control-allow-origin",
  "authorization",
  "cache-control",
  "connection",
  "content-length",
  "content-type",
  "dnt",
  "git-protocol",
  "pragma",
  "range",
  "referer",
  "user-agent",
  "x-authorization",
  "x-http-method-override",
  "x-requested-with",
];

// Headers exposed from the proxy to clients
const exposeHeaders = [
  "accept-ranges",
  "age",
  "cache-control",
  "content-length",
  "content-language",
  "content-type",
  "date",
  "etag",
  "expires",
  "last-modified",
  "location",
  "pragma",
  "server",
  "transfer-encoding",
  "vary",
  "x-github-request-id",
  "x-redirected-url",
];

// Git-specific content types that need to be handled
const gitContentTypes = [
  "application/x-git-upload-pack-request",
  "application/x-git-upload-pack-result",
  "application/x-git-receive-pack-request",
  "application/x-git-receive-pack-result",
];

// JSON Schema for health check response
const healthCheckResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
  },
  required: ["status"],
  additionalProperties: false,
};

// JSON Schema for error responses
const errorResponseSchema = {
  type: "object",
  properties: {
    statusCode: { type: "number" },
    error: { type: "string" },
    message: { type: "string" },
  },
  required: ["statusCode", "error", "message"],
  additionalProperties: false,
};

// Parse the URL and add it to the request object
function parseUrl(
  req: FastifyRequest,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  const url = new URL(req.url, "http://localhost");
  const parsedUrl: ParsedUrl = {
    pathname: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
  };

  (req as RequestWithParsedUrl).parsedUrl = parsedUrl;
  done();
}

// Check if the request is a valid Git request
function isGitRequest(
  req: RequestWithParsedUrl,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  if (!req.parsedUrl || !allowRequest(req, req.parsedUrl)) {
    done(new Error("Not a valid Git request"));
    return;
  }
  done();
}

// Proxy the request to the Git server
async function proxyRequest(
  req: RequestWithParsedUrl,
  reply: FastifyReply,
  options: ProxyOptions
) {
  if (!req.parsedUrl) {
    reply.code(400).send("Invalid request");
    return;
  }

  const path = req.url;
  const parts = path.match(/\/([^/]*)\/(.*)/) || [];

  if (parts.length < 3) {
    reply.code(400).send("Invalid request path");
    return;
  }

  const pathdomain = parts[1];
  const remainingpath = parts[2];

  // Check if the domain is in the insecure origins list
  const insecureOrigins = options.insecureOrigins || [];
  const protocol = insecureOrigins.includes(pathdomain) ? "http" : "https";

  // Prepare headers for the proxied request
  const headers: Record<string, string> = {};
  for (const h of allowHeaders) {
    const headerValue = req.headers[h];
    if (headerValue) {
      headers[h] = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    }
  }

  // GitHub uses user-agent sniffing for git/* and changes its behavior
  if (!headers["user-agent"] || !headers["user-agent"].startsWith("git/")) {
    headers["user-agent"] = "git/@isomorphic-git/cors-proxy";
  }

  try {
    // Make the request to the Git server
    const fetchResponse = await fetch(
      `${protocol}://${pathdomain}/${remainingpath}`,
      {
        method: req.method,
        headers,
        redirect: "manual",
        body:
          req.method !== "GET" && req.method !== "HEAD"
            ? (req.body as Buffer | string | NodeJS.ReadableStream)
            : undefined,
      }
    );

    // Set the status code
    reply.code(fetchResponse.status);

    // Set headers from the response
    for (const h of exposeHeaders) {
      if (h === "content-length") continue;
      const headerValue = fetchResponse.headers.get(h);
      if (headerValue) {
        reply.header(h, headerValue);
      }
    }

    // Handle redirects
    if (fetchResponse.headers.has("location")) {
      const newUrl = fetchResponse.headers
        .get("location")
        ?.replace(/^https?:\//, "");
      if (newUrl) {
        reply.header("location", newUrl);
      }
    }

    // Set redirected URL if applicable
    if (fetchResponse.redirected) {
      reply.header("x-redirected-url", fetchResponse.url);
    }

    // Stream the response body
    return reply.send(fetchResponse.body);
  } catch (error) {
    console.error("Proxy error:", error);
    reply.code(502).send("Proxy error");
  }
}

export function registerProxyMiddleware(
  fastify: FastifyInstance,
  options: ProxyOptions = {}
) {
  // Register content type parsers for Git-specific content types
  for (const contentType of gitContentTypes) {
    fastify.addContentTypeParser(
      contentType,
      { parseAs: "buffer" },
      (req, body, done) => {
        done(null, body);
      }
    );
  }

  // Register CORS plugin
  fastify.register(fastifyCors, {
    origin: options.origin || "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: allowHeaders,
    exposedHeaders: exposeHeaders,
    credentials: false,
  });

  // Add hooks for parsing URL and validating Git requests
  fastify.addHook("preHandler", parseUrl);

  // Add health check endpoint for Railway
  fastify.get("/health", {
    schema: {
      response: {
        200: healthCheckResponseSchema,
        "4xx": errorResponseSchema,
        "5xx": errorResponseSchema,
      },
    },
    handler: async (_req, reply) => {
      return reply.code(200).send({ status: "ok" });
    },
  });

  // Add route for the root path
  fastify.get("/", async (_req, reply) => {
    const html = `<!DOCTYPE html>
    <html>
      <title>@isomorphic-git/cors-proxy</title>
      <h1>@isomorphic-git/cors-proxy</h1>
      <p>This is the server software that runs on <a href="https://cors.isomorphic-git.org">https://cors.isomorphic-git.org</a>
         &ndash; a free service (generously sponsored by <a href="https://www.clever-cloud.com/?utm_source=ref&utm_medium=link&utm_campaign=isomorphic-git">Clever Cloud</a>)
         for users of <a href="https://isomorphic-git.org">isomorphic-git</a> that enables cloning and pushing repos in the browser.</p>
      <p>The source code is hosted on Github at <a href="https://github.com/isomorphic-git/cors-proxy">https://github.com/isomorphic-git/cors-proxy</a></p>
      <p>It can also be installed from npm with <code>npm install <a href="https://npmjs.org/package/@isomorphic-git/cors-proxy">@isomorphic-git/cors-proxy</a></code></p>

      <h2>Terms of Use</h2>
      <p><b>This free service is provided to you AS IS with no guarantees.
      By using this free service, you promise not to use excessive amounts of bandwidth.
      </b></p>

      <p><b>If you are cloning or pushing large amounts of data your IP address may be banned.
      Please run your own instance of the software if you need to make heavy use this service.</b></p>

      <h2>Allowed Origins</h2>
      This proxy allows git clone / fetch / push / getRemoteInfo requests from these domains: <code>${
        options.origin || "*"
      }</code>
    </html>`;

    return reply.type("text/html").send(html);
  });

  // Add route for Git requests
  fastify.route({
    method: ["GET", "POST"],
    url: "/*",
    schema: {
      response: {
        "4xx": errorResponseSchema,
        "5xx": errorResponseSchema,
      },
    },
    preHandler: [isGitRequest],
    handler: async (req, reply) => {
      return proxyRequest(req as RequestWithParsedUrl, reply, options);
    },
  });
}
