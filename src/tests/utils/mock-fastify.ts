import { vi } from "vitest";
import { FastifyInstance } from "fastify";

/**
 * Creates a mock Fastify instance for testing
 * @returns A mocked Fastify instance
 */
export function createMockFastifyInstance(): FastifyInstance {
  return {
    // Core methods
    register: vi.fn(),
    addHook: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    options: vi.fn(),
    patch: vi.fn(),
    head: vi.fn(),
    all: vi.fn(),
    route: vi.fn(),

    // Decoration methods
    decorate: vi.fn(),
    decorateReply: vi.fn(),
    decorateRequest: vi.fn(),

    // Schema methods
    addSchema: vi.fn(),
    getSchema: vi.fn(),
    hasSchema: vi.fn(),

    // Compiler methods
    setSerializerCompiler: vi.fn(),
    setValidatorCompiler: vi.fn(),
    setSchemaErrorFormatter: vi.fn(),
    setReplySerializer: vi.fn(),
    setSchemaController: vi.fn(),

    // Error handling
    setErrorHandler: vi.fn(),
    setNotFoundHandler: vi.fn(),

    // Content type parsers
    addContentTypeParser: vi.fn(),
    hasContentTypeParser: vi.fn(),
    removeContentTypeParser: vi.fn(),
    removeAllContentTypeParsers: vi.fn(),

    // Route management
    hasRoute: vi.fn(),

    // Lifecycle methods
    ready: vi.fn().mockResolvedValue(undefined),
    listen: vi.fn().mockResolvedValue("localhost"),
    close: vi.fn().mockResolvedValue(undefined),

    // Testing
    inject: vi.fn(),

    // Utilities
    printRoutes: vi.fn(),
    printPlugins: vi.fn(),

    // Properties
    prefix: "",
    pluginName: "",
    server: {},

    // Logging
    log: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      warn: vi.fn(),
      trace: vi.fn(),
      child: vi.fn().mockReturnThis(),
    },
  } as unknown as FastifyInstance;
}
