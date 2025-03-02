import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerProxyMiddleware } from "../../middleware/proxy";
import { FastifyReply, FastifyRequest } from "fastify";
import { RequestWithParsedUrl } from "../../utils/types";
import { createMockFastifyInstance } from "../utils/mock-fastify";

// Mock node-fetch
vi.mock("node-fetch", () => ({
  default: vi.fn(),
}));

// Mock @fastify/cors
vi.mock("@fastify/cors", () => ({
  default: vi.fn(),
}));

describe("Proxy Middleware", () => {
  // Create a mock Fastify instance using our factory
  const mockFastify = createMockFastifyInstance();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerProxyMiddleware", () => {
    it("should register the CORS plugin", () => {
      registerProxyMiddleware(mockFastify);

      expect(mockFastify.register).toHaveBeenCalledTimes(1);
      expect(mockFastify.register).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          origin: "*",
          methods: ["GET", "POST", "OPTIONS"],
        })
      );
    });

    it("should add preHandler hook for URL parsing", () => {
      registerProxyMiddleware(mockFastify);

      expect(mockFastify.addHook).toHaveBeenCalledTimes(1);
      expect(mockFastify.addHook).toHaveBeenCalledWith(
        "preHandler",
        expect.any(Function)
      );
    });

    it("should register a route for the root path", () => {
      registerProxyMiddleware(mockFastify);

      // Updated to account for both root and health check endpoints
      expect(mockFastify.get).toHaveBeenCalledTimes(2);
      expect(mockFastify.get).toHaveBeenCalledWith("/", expect.any(Function));
      // Updated to check for an object with schema and handler properties
      expect(mockFastify.get).toHaveBeenCalledWith(
        "/health",
        expect.objectContaining({
          schema: expect.any(Object),
          handler: expect.any(Function),
        })
      );
    });

    it("should register a catch-all route for Git requests", () => {
      registerProxyMiddleware(mockFastify);

      expect(mockFastify.route).toHaveBeenCalledTimes(1);
      expect(mockFastify.route).toHaveBeenCalledWith(
        expect.objectContaining({
          method: ["GET", "POST"],
          url: "/*",
          schema: expect.any(Object),
        })
      );
    });

    it("should use custom origin if provided", () => {
      registerProxyMiddleware(mockFastify, {
        origin: "https://example.com",
      });

      expect(mockFastify.register).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          origin: "https://example.com",
        })
      );
    });

    it("should register content type parsers for Git-specific content types", () => {
      registerProxyMiddleware(mockFastify);

      // Check that content type parsers were registered for Git-specific content types
      expect(mockFastify.addContentTypeParser).toHaveBeenCalledTimes(4);
      expect(mockFastify.addContentTypeParser).toHaveBeenCalledWith(
        "application/x-git-upload-pack-request",
        { parseAs: "buffer" },
        expect.any(Function)
      );
      expect(mockFastify.addContentTypeParser).toHaveBeenCalledWith(
        "application/x-git-upload-pack-result",
        { parseAs: "buffer" },
        expect.any(Function)
      );
      expect(mockFastify.addContentTypeParser).toHaveBeenCalledWith(
        "application/x-git-receive-pack-request",
        { parseAs: "buffer" },
        expect.any(Function)
      );
      expect(mockFastify.addContentTypeParser).toHaveBeenCalledWith(
        "application/x-git-receive-pack-result",
        { parseAs: "buffer" },
        expect.any(Function)
      );
    });
  });

  describe("URL parsing", () => {
    it("should parse the URL and add it to the request object", () => {
      // Get the parseUrl function
      registerProxyMiddleware(mockFastify);
      const parseUrlFn = (mockFastify.addHook as ReturnType<typeof vi.fn>).mock
        .calls[0][1];

      // Create mock request and reply
      const req = {
        url: "/github.com/isomorphic-git/cors-proxy?service=git-upload-pack",
      } as FastifyRequest;
      const reply = {} as FastifyReply;
      const done = vi.fn();

      // Call the parseUrl function
      parseUrlFn(req, reply, done);

      // Check that the URL was parsed and added to the request object
      const parsedReq = req as RequestWithParsedUrl;
      expect(parsedReq.parsedUrl).toBeDefined();
      expect(parsedReq.parsedUrl!.pathname).toBe(
        "/github.com/isomorphic-git/cors-proxy"
      );
      expect(parsedReq.parsedUrl!.query).toEqual({
        service: "git-upload-pack",
      });
      expect(done).toHaveBeenCalled();
    });
  });

  describe("Root path handler", () => {
    it("should return HTML for the root path", async () => {
      // Get the root path handler
      registerProxyMiddleware(mockFastify);

      // Find the root path handler (index 0 or 1 depending on registration order)
      const getRootHandlerCalls = (mockFastify.get as ReturnType<typeof vi.fn>)
        .mock.calls;
      const rootHandlerCall = getRootHandlerCalls.find(
        (call) => call[0] === "/"
      );
      expect(rootHandlerCall).toBeDefined();
      const rootHandler = rootHandlerCall![1];

      // Create mock reply
      const reply = {
        type: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      // Call the root handler
      await rootHandler({}, reply);

      // Check that HTML was returned
      expect(reply.type).toHaveBeenCalledWith("text/html");
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("<!DOCTYPE html>")
      );
    });

    it("should return status ok for the health check endpoint", async () => {
      // Get the health check handler
      registerProxyMiddleware(mockFastify);

      // Find the health check handler
      const getHealthHandlerCalls = (
        mockFastify.get as ReturnType<typeof vi.fn>
      ).mock.calls;
      const healthHandlerCall = getHealthHandlerCalls.find(
        (call) => call[0] === "/health"
      );
      expect(healthHandlerCall).toBeDefined();

      // Extract the handler function from the route configuration
      const healthConfig = healthHandlerCall![1];
      expect(healthConfig).toBeDefined();
      expect(healthConfig.handler).toBeDefined();
      const healthHandler = healthConfig.handler;

      // Create mock reply with code method
      const reply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      // Call the health check handler
      await healthHandler({}, reply);

      // Check that status ok was returned
      expect(reply.code).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ status: "ok" });
    });
  });

  describe("Git content type handling", () => {
    it("should handle Git-specific content types", () => {
      registerProxyMiddleware(mockFastify);

      // Get the content type parser function
      const contentTypeParserCalls = (
        mockFastify.addContentTypeParser as ReturnType<typeof vi.fn>
      ).mock.calls;
      const parserCall = contentTypeParserCalls[0];
      expect(parserCall).toBeDefined();
      const parserFn = parserCall[2];

      // Create mock request, body, and done callback
      const req = {} as FastifyRequest;
      const body = Buffer.from("test");
      const done = vi.fn();

      // Call the parser function
      parserFn(req, body, done);

      // Check that the body was passed through unchanged
      expect(done).toHaveBeenCalledWith(null, body);
    });
  });
});
