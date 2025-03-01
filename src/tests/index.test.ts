import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServer } from "../index";
import { registerProxyMiddleware } from "../middleware/proxy";
import { createMockFastifyInstance } from "./utils/mock-fastify";
import fastify from "fastify";

// Mock fastify
vi.mock("fastify", () => ({
  default: vi.fn().mockImplementation(() => createMockFastifyInstance()),
}));

// Mock the registerProxyMiddleware function
vi.mock("../middleware/proxy", () => ({
  registerProxyMiddleware: vi.fn(),
}));

describe("createServer", () => {
  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.ALLOW_ORIGIN;
    delete process.env.INSECURE_HTTP_ORIGINS;

    // Reset mocks
    vi.clearAllMocks();
  });

  it("should create a Fastify instance", () => {
    const server = createServer();

    expect(server).toBeDefined();
    expect(server.listen).toBeDefined();
    expect(typeof server.listen).toBe("function");
    expect(fastify).toHaveBeenCalled();
  });

  it("should register the proxy middleware with default options", () => {
    createServer();

    expect(registerProxyMiddleware).toHaveBeenCalledTimes(1);
    // The first argument should be the fastify instance
    const mockFastifyInstance = vi.mocked(fastify).mock.results[0].value;
    expect(registerProxyMiddleware).toHaveBeenCalledWith(mockFastifyInstance, {
      origin: undefined,
      insecureOrigins: [],
    });
  });

  it("should use environment variables for configuration", () => {
    // Set environment variables
    process.env.ALLOW_ORIGIN = "https://example.com";
    process.env.INSECURE_HTTP_ORIGINS = "example.org,test.local";

    createServer();

    const mockFastifyInstance = vi.mocked(fastify).mock.results[0].value;
    expect(registerProxyMiddleware).toHaveBeenCalledWith(mockFastifyInstance, {
      origin: "https://example.com",
      insecureOrigins: ["example.org", "test.local"],
    });
  });

  it("should prioritize options over environment variables", () => {
    // Set environment variables
    process.env.ALLOW_ORIGIN = "https://example.com";
    process.env.INSECURE_HTTP_ORIGINS = "example.org,test.local";

    // Create server with explicit options
    createServer({
      insecureOrigins: ["custom.org"],
    });

    const mockFastifyInstance = vi.mocked(fastify).mock.results[0].value;
    expect(registerProxyMiddleware).toHaveBeenCalledWith(mockFastifyInstance, {
      origin: "https://example.com",
      insecureOrigins: ["custom.org"],
    });
  });

  it("should configure logger based on NODE_ENV", () => {
    // Test production mode
    process.env.NODE_ENV = "production";
    createServer();
    expect(fastify).toHaveBeenCalledWith(
      expect.objectContaining({ logger: false })
    );

    // Reset for development mode
    vi.clearAllMocks();
    process.env.NODE_ENV = "development";
    createServer();
    expect(fastify).toHaveBeenCalledWith(
      expect.objectContaining({ logger: true })
    );

    // Reset NODE_ENV
    delete process.env.NODE_ENV;
  });
});
