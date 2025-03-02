import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServer } from "../index";
import { registerProxyMiddleware } from "../middleware/proxy";
import { createMockFastifyInstance } from "./utils/mock-fastify";
import fastify from "fastify";
import fastifySensible from "@fastify/sensible";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyHelmet from "@fastify/helmet";

// Mock fastify
vi.mock("fastify", () => ({
  default: vi.fn(() => createMockFastifyInstance()),
}));

// Mock @fastify/sensible
vi.mock("@fastify/sensible", () => {
  const mockPlugin = vi.fn();
  return {
    default: mockPlugin,
  };
});

// Mock @fastify/rate-limit
vi.mock("@fastify/rate-limit", () => {
  const mockPlugin = vi.fn();
  return {
    default: mockPlugin,
  };
});

// Mock @fastify/helmet
vi.mock("@fastify/helmet", () => {
  const mockPlugin = vi.fn();
  return {
    default: mockPlugin,
  };
});

// Mock the registerProxyMiddleware function
vi.mock("../middleware/proxy", () => ({
  registerProxyMiddleware: vi.fn(),
}));

describe("createServer", () => {
  let mockFastifyInstance: ReturnType<typeof createMockFastifyInstance>;

  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.ALLOW_ORIGIN;
    delete process.env.INSECURE_HTTP_ORIGINS;

    // Reset mocks
    vi.clearAllMocks();

    // Create a fresh mock instance for each test
    mockFastifyInstance = createMockFastifyInstance();
    vi.mocked(fastify).mockReturnValue(mockFastifyInstance);
  });

  it("should create a Fastify instance", () => {
    const server = createServer();

    expect(server).toBeDefined();
    expect(server.listen).toBeDefined();
    expect(typeof server.listen).toBe("function");
    expect(fastify).toHaveBeenCalled();
  });

  it("should register fastify-sensible plugin", () => {
    createServer();
    expect(mockFastifyInstance.register).toHaveBeenCalledWith(fastifySensible);
  });

  it("should register security plugins", () => {
    createServer();
    expect(mockFastifyInstance.register).toHaveBeenCalledWith(
      fastifyHelmet,
      expect.any(Object)
    );
    expect(mockFastifyInstance.register).toHaveBeenCalledWith(
      fastifyRateLimit,
      expect.any(Object)
    );
  });

  it("should set up an error handler", () => {
    createServer();
    expect(mockFastifyInstance.setErrorHandler).toHaveBeenCalled();
  });

  it("should register the proxy middleware with default options", () => {
    createServer();

    expect(registerProxyMiddleware).toHaveBeenCalledTimes(1);
    // The first argument should be the fastify instance
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
      expect.objectContaining({
        logger: false,
        connectionTimeout: 30000,
        keepAliveTimeout: 30000,
        maxRequestsPerSocket: 1000,
      })
    );

    // Reset for development mode
    vi.clearAllMocks();
    process.env.NODE_ENV = "development";
    createServer();
    expect(fastify).toHaveBeenCalledWith(
      expect.objectContaining({
        logger: true,
        connectionTimeout: 30000,
        keepAliveTimeout: 30000,
        maxRequestsPerSocket: 1000,
      })
    );

    // Reset NODE_ENV
    delete process.env.NODE_ENV;
  });
});
