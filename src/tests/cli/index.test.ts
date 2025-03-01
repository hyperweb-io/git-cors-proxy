import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { main } from "../../cli/index";
import fs from "fs";
import { createServer } from "../../index";
import kill from "tree-kill";
import daemonize from "daemonize-process";

// Define the mock server type
type MockServer = {
  listen: Mock;
  close: Mock;
};

// Create a mock server factory
const createMockServer = () => ({
  listen: vi.fn().mockResolvedValue("localhost"),
  close: vi.fn().mockResolvedValue(undefined),
});

// Mock dependencies
vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock("path", () => ({
  default: {
    join: (...args: string[]) => args.join("/"),
  },
  join: (...args: string[]) => args.join("/"),
}));

// Mock createServer to return our mock server
vi.mock("../../index", () => ({
  createServer: vi.fn().mockImplementation(() => createMockServer()),
}));

// Mock tree-kill to properly call the callback with the correct arguments
vi.mock("tree-kill", () => ({
  default: vi.fn((pid, callback) => {
    // Immediately call the callback to simulate successful process termination
    if (typeof callback === "function") {
      callback(null); // Call with null error to simulate success
    }
    return 0;
  }),
}));

vi.mock("daemonize-process", () => ({
  default: vi.fn(),
}));

// Mock process.exit
const originalExit = process.exit;
const mockExit = vi.fn();

describe("CLI", () => {
  // Reference to the mock server for tests
  let mockServer: MockServer;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exit = mockExit as any;
    process.cwd = vi.fn().mockReturnValue("/test");

    // Create a fresh mock server for each test
    mockServer = createMockServer();

    // Make createServer return our mock server
    (createServer as Mock).mockReturnValue(mockServer);
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe("startServer", () => {
    it("should start the server with default options", async () => {
      await main({ _: ["start"] });

      expect(createServer).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/test/cors-proxy.pid",
        expect.any(String),
        "utf8"
      );
    });

    it("should start the server with custom port", async () => {
      await main({ _: ["start"], p: 8080 });

      expect(mockServer.listen).toHaveBeenCalledWith({
        port: 8080,
        host: "0.0.0.0",
      });
    });

    it("should daemonize the process if requested", async () => {
      await main({ _: ["start"], d: true });

      expect(daemonize).toHaveBeenCalled();
    });

    it("should handle server start errors", async () => {
      // Override the listen method to simulate an error
      mockServer.listen.mockRejectedValueOnce(new Error("Server start error"));

      await main({ _: ["start"] });

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe("stopServer", () => {
    it("should stop the server", async () => {
      // Mock readFileSync to return a PID
      (fs.readFileSync as Mock).mockReturnValueOnce("1234");

      // Spy on console.log to verify messages
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Mock the kill function to directly call its callback
      (kill as Mock).mockImplementation((pid, callback) => {
        // Synchronously call the callback to ensure it runs
        callback(null);
        return 0;
      });

      // Call the stop command
      await main({ _: ["stop"] });

      // Verify readFileSync was called with the correct path
      expect(fs.readFileSync).toHaveBeenCalledWith(
        "/test/cors-proxy.pid",
        "utf8"
      );

      // Verify kill was called with the PID
      expect(kill).toHaveBeenCalledWith(1234, expect.any(Function));

      // Verify the success message was logged
      expect(consoleSpy).toHaveBeenCalledWith("CORS proxy server stopped");

      // Verify unlinkSync was called
      expect(fs.unlinkSync).toHaveBeenCalledWith("/test/cors-proxy.pid");

      // Restore console.log
      consoleSpy.mockRestore();
    });

    it("should handle invalid PID file", async () => {
      (fs.readFileSync as Mock).mockReturnValueOnce("invalid");

      await main({ _: ["stop"] });

      expect(kill).not.toHaveBeenCalled();
    });

    it("should handle missing PID file", async () => {
      (fs.readFileSync as Mock).mockImplementationOnce(() => {
        throw new Error("File not found");
      });

      await main({ _: ["stop"] });

      expect(kill).not.toHaveBeenCalled();
    });
  });

  describe("help", () => {
    it("should show help for unknown commands", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await main({ _: ["unknown"] });

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain("Usage:");

      consoleSpy.mockRestore();
    });
  });
});
