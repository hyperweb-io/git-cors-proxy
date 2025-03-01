#!/usr/bin/env node
import fs from "fs";
import path from "path";
import kill from "tree-kill";
import minimisted from "minimisted";
import daemonize from "daemonize-process";
import { createServer } from "../index";

interface CliOptions {
  _: string[];
  p?: number;
  d?: boolean;
}

/**
 * Start the CORS proxy server
 * @param port Port to listen on
 * @param daemon Whether to run as a daemon
 */
async function startServer(
  port: number = 9999,
  daemon: boolean = false
): Promise<void> {
  // Daemonize if requested
  if (daemon) {
    daemonize();
  }

  // Create and start the server
  const server = createServer();

  try {
    await server.listen({ port, host: "0.0.0.0" });

    // Write PID file
    fs.writeFileSync(
      path.join(process.cwd(), "cors-proxy.pid"),
      String(process.pid),
      "utf8"
    );

    console.log(`CORS proxy server listening on port ${port}`);

    // Handle process exit
    process.on("SIGINT", async () => {
      await server.close();
      process.exit(0);
    });
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
}

/**
 * Stop the CORS proxy server
 */
function stopServer(): void {
  try {
    // Read PID file
    const pidPath = path.join(process.cwd(), "cors-proxy.pid");
    const pid = parseInt(fs.readFileSync(pidPath, "utf8"), 10);

    if (isNaN(pid)) {
      console.error("Invalid PID in cors-proxy.pid");
      return;
    }

    console.log(`Stopping CORS proxy server (PID: ${pid})...`);

    // Kill the process
    kill(pid, (err) => {
      if (err) {
        console.error("Error stopping server:", err);
      } else {
        console.log("CORS proxy server stopped");
        fs.unlinkSync(pidPath);
      }
    });
  } catch (err) {
    console.error("No cors-proxy.pid file found or error reading it");
  }
}

/**
 * Main CLI function
 */
async function main(options: CliOptions): Promise<void> {
  const [command] = options._;

  switch (command) {
    case "start":
      await startServer(options.p, options.d);
      break;
    case "stop":
      stopServer();
      break;
    default:
      console.log(`
Usage: cors-proxy [command] [options]

Commands:
  start     Start the CORS proxy server
  stop      Stop the CORS proxy server

Options:
  -p        Port to listen on (default: 9999)
  -d        Run as a daemon
`);
      break;
  }
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  minimisted(main);
}

export { main };
