// This file contains setup code for Vitest tests
import { beforeAll, afterAll, afterEach, vi } from "vitest";

// Mock environment variables
beforeAll(() => {
  process.env.ALLOW_ORIGIN = "*";
  process.env.INSECURE_HTTP_ORIGINS = "example.com,test.local";
});

// Clean up environment variables after tests
afterAll(() => {
  delete process.env.ALLOW_ORIGIN;
  delete process.env.INSECURE_HTTP_ORIGINS;
});

// Reset all mocks after each test
afterEach(() => {
  vi.resetAllMocks();
});
