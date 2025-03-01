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
      expect(mockFastify.get).toHaveBeenCalledWith(
        "/health",
        expect.any(Function)
      );
    });

    it("should register a catch-all route for Git requests", () => {
      registerProxyMiddleware(mockFastify);

      expect(mockFastify.route).toHaveBeenCalledTimes(1);
      expect(mockFastify.route).toHaveBeenCalledWith(
        expect.objectContaining({
          method: ["GET", "POST"],
          url: "/*",
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
      const parseUrl = (mockFastify.addHook as ReturnType<typeof vi.fn>).mock
        .calls[0][1];

      // Create mock request and reply
      const req: Partial<FastifyRequest> = {
        url: "/github.com/user/repo/info/refs?service=git-upload-pack",
      };
      const reply = {} as FastifyReply;
      const done = vi.fn();

      // Call the parseUrl function
      parseUrl(req as FastifyRequest, reply, done);

      // Check that the URL was parsed correctly
      expect((req as RequestWithParsedUrl).parsedUrl).toBeDefined();
      expect((req as RequestWithParsedUrl).parsedUrl?.pathname).toBe(
        "/github.com/user/repo/info/refs"
      );
      expect((req as RequestWithParsedUrl).parsedUrl?.query.service).toBe(
        "git-upload-pack"
      );
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
      const healthHandler = healthHandlerCall![1];

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
    it("should correctly parse Git-specific content types", () => {
      registerProxyMiddleware(mockFastify);

      // Get the content type parser for git-upload-pack-request
      const contentTypeParserCalls = (
        mockFastify.addContentTypeParser as ReturnType<typeof vi.fn>
      ).mock.calls;
      const parserCall = contentTypeParserCalls.find(
        (call) => call[0] === "application/x-git-upload-pack-request"
      );

      // Ensure the parser was found
      expect(parserCall).toBeDefined();
      const gitUploadPackParser = parserCall![2];

      // Create mock request, body, and done callback
      const req = {} as FastifyRequest;
      const body = Buffer.from("test git data");
      const done = vi.fn();

      // Call the parser
      gitUploadPackParser(req, body, done);

      // Check that the body was passed through unchanged
      expect(done).toHaveBeenCalledWith(null, body);
    });
  });
});
