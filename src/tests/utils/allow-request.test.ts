import { describe, it, expect } from "vitest";
import { allowRequest } from "../../utils/allow-request";
import { ParsedUrl } from "../../utils/types";
import { FastifyRequest } from "fastify";

describe("allowRequest", () => {
  // Helper function to create a mock request
  function createMockRequest(
    method: string,
    headers: Record<string, string> = {}
  ): FastifyRequest {
    // Create a minimal mock that satisfies the properties used in allowRequest
    return {
      method,
      headers,
    } as unknown as FastifyRequest;
  }

  // Helper function to create a parsed URL
  function createParsedUrl(pathname: string, service?: string): ParsedUrl {
    return {
      pathname,
      query: {
        service,
      },
    };
  }

  describe("Git info/refs requests", () => {
    it("should allow GET info/refs requests for git-upload-pack", () => {
      const req = createMockRequest("GET");
      const url = createParsedUrl("/repo/info/refs", "git-upload-pack");

      expect(allowRequest(req, url)).toBe(true);
    });

    it("should allow GET info/refs requests for git-receive-pack", () => {
      const req = createMockRequest("GET");
      const url = createParsedUrl("/repo/info/refs", "git-receive-pack");

      expect(allowRequest(req, url)).toBe(true);
    });

    it("should not allow GET info/refs requests without a valid service", () => {
      const req = createMockRequest("GET");
      const url = createParsedUrl("/repo/info/refs", "invalid-service");

      expect(allowRequest(req, url)).toBe(false);
    });

    it("should allow OPTIONS preflight requests for info/refs", () => {
      const req = createMockRequest("OPTIONS");
      const url = createParsedUrl("/repo/info/refs", "git-upload-pack");

      expect(allowRequest(req, url)).toBe(true);
    });
  });

  describe("Git upload-pack requests", () => {
    it("should allow POST git-upload-pack requests", () => {
      const req = createMockRequest("POST", {
        "content-type": "application/x-git-upload-pack-request",
      });
      const url = createParsedUrl("/repo/git-upload-pack");

      expect(allowRequest(req, url)).toBe(true);
    });

    it("should not allow POST git-upload-pack requests with wrong content-type", () => {
      const req = createMockRequest("POST", {
        "content-type": "application/json",
      });
      const url = createParsedUrl("/repo/git-upload-pack");

      expect(allowRequest(req, url)).toBe(false);
    });

    it("should allow OPTIONS preflight requests for git-upload-pack", () => {
      const req = createMockRequest("OPTIONS", {
        "access-control-request-headers": "content-type",
      });
      const url = createParsedUrl("/repo/git-upload-pack");

      expect(allowRequest(req, url)).toBe(true);
    });
  });

  describe("Git receive-pack requests", () => {
    it("should allow POST git-receive-pack requests", () => {
      const req = createMockRequest("POST", {
        "content-type": "application/x-git-receive-pack-request",
      });
      const url = createParsedUrl("/repo/git-receive-pack");

      expect(allowRequest(req, url)).toBe(true);
    });

    it("should not allow POST git-receive-pack requests with wrong content-type", () => {
      const req = createMockRequest("POST", {
        "content-type": "application/json",
      });
      const url = createParsedUrl("/repo/git-receive-pack");

      expect(allowRequest(req, url)).toBe(false);
    });

    it("should allow OPTIONS preflight requests for git-receive-pack", () => {
      const req = createMockRequest("OPTIONS", {
        "access-control-request-headers": "content-type",
      });
      const url = createParsedUrl("/repo/git-receive-pack");

      expect(allowRequest(req, url)).toBe(true);
    });
  });

  describe("Non-Git requests", () => {
    it("should not allow requests to non-Git endpoints", () => {
      const req = createMockRequest("GET");
      const url = createParsedUrl("/api/users");

      expect(allowRequest(req, url)).toBe(false);
    });

    it("should not allow unsupported HTTP methods", () => {
      const req = createMockRequest("PUT", {
        "content-type": "application/x-git-receive-pack-request",
      });
      const url = createParsedUrl("/repo/git-receive-pack");

      expect(allowRequest(req, url)).toBe(false);
    });
  });
});
