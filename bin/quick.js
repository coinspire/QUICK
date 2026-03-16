#!/usr/bin/env node
import { Command } from "commander";
import clipboardy from "clipboardy";
import chalk from "chalk";

import {
  showIntro,
  showOutro,
  startConnectingSpinner,
  showUrlBox,
  showErrorBox,
  showKeepAliveHint,
  showCommandsOverview,
} from "../src/ui.js";
import { createTunnel, isPortActive } from "../src/tunnel.js";

const program = new Command();

program
  .name("quick")
  .description("Share local dev servers with one command.")
  .addHelpText(
    "after",
    `
Examples:
  quick up --port 3000
`
  );

program
  .command("up")
  .description("Start a shareable tunnel for a local port.")
  .requiredOption("--port <number>", "Local port to share", parsePort)
  .addHelpText(
    "after",
    `
Description:
  Creates a public link to your local server using localtunnel.
  Copies the link to your clipboard automatically.

Examples:
  quick up --port 3000
  quick up --port 5173
`
  )
  .action(async (opts) => {
    showIntro();

    const s = startConnectingSpinner();

    const active = await isPortActive(opts.port);
    if (!active) {
      s.stop("Failed");
      console.error(showErrorBox("No server found on this port."));
      process.exitCode = 1;
      return;
    }

    try {
      const tunnel = await createTunnel({ port: opts.port });
      tunnel.onError((err) => {
        // Keep it simple; localtunnel will usually reconnect or exit.
        console.error(chalk.red(String(err?.message ?? err)));
      });

      s.stop("Connected");
      await clipboardy.write(tunnel.url);

      console.log(showUrlBox(tunnel.url));
      showKeepAliveHint();

      const stop = async () => {
        try {
          tunnel.close();
        } catch {}
        showOutro("Stopped sharing.");
        process.exit(0);
      };

      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);

      // Keep the process alive until Ctrl+C.
      await new Promise(() => {});
    } catch (e) {
      s.stop("Failed");
      console.error(showErrorBox(String(e?.message ?? e)));
      process.exitCode = 1;
    }
  });
// If no subcommand is provided, show the QUICK home screen with commands list.
if (process.argv.length <= 2) {
  showIntro();
  showCommandsOverview();
  process.exit(0);
} else {
  await program.parseAsync(process.argv);
}

function parsePort(value) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n <= 0 || n > 65535) {
    throw new Error("Port must be a number between 1 and 65535.");
  }
  return n;
}

