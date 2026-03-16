#!/usr/bin/env node
import { Command } from "commander";
import clipboardy from "clipboardy";
import chalk from "chalk";
import readline from "node:readline";
import https from "node:https";

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
    // CLI one-shot: block until Ctrl+C.
    await startTunnelFlow(opts.port, { stayUntilCtrlC: true, fromShell: false });
  });
// If no subcommand is provided, drop into an interactive QUICK shell.
if (process.argv.length <= 2) {
  await runQuickShell();
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

async function startTunnelFlow(port, { stayUntilCtrlC, fromShell }) {
  showIntro();

  const s = startConnectingSpinner();

  const active = await isPortActive(port);
  if (!active) {
    s.stop("Failed");
    console.error(showErrorBox("No server found on this port."));
    if (!fromShell) process.exitCode = 1;
    return null;
  }

  try {
    const tunnel = await createTunnel({ port });
    tunnel.onError((err) => {
      console.error(chalk.red(String(err?.message ?? err)));
    });

    s.stop("Connected");
    await clipboardy.write(tunnel.url);

    console.log(showUrlBox(tunnel.url));

    // Try to help with the loca.lt tunnel password page by fetching the password
    // from this machine and printing it for the developer to share.
    try {
      const pw = await fetchTunnelPassword();
      if (pw) {
        console.log(
          chalk.dim(
            `Tunnel password (for loca.lt warning page): ${chalk.bold(
              pw.trim()
            )}`
          )
        );
      }
    } catch {
      // Non-fatal if this fails; the tunnel still works.
    }

    if (stayUntilCtrlC) {
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

      await new Promise(() => {});
    }

    return tunnel;
  } catch (e) {
    s.stop("Failed");
    console.error(showErrorBox(String(e?.message ?? e)));
    if (!fromShell) process.exitCode = 1;
    return null;
  }
}

function fetchTunnelPassword() {
  return new Promise((resolve, reject) => {
    https
      .get("https://loca.lt/mytunnelpassword", (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(
              new Error(
                `Unexpected status when fetching tunnel password: ${res.statusCode}`
              )
            );
          }
        });
      })
      .on("error", (err) => reject(err));
  });
}

async function runQuickShell() {
  showIntro();
  showCommandsOverview();

  let currentTunnel = null;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "quick> ",
  });

  const closeTunnel = () => {
    if (currentTunnel) {
      try {
        currentTunnel.close();
      } catch {}
      currentTunnel = null;
    }
  };

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input === "exit" || input === "quit" || input === "quick --exit") {
      closeTunnel();
      showOutro("Goodbye.");
      rl.close();
      process.exit(0);
      return;
    }

    if (input === "help" || input === "quick --help") {
      console.log("\nType:");
      console.log("  up <port>   - share a local dev server (e.g. up 3000)");
      console.log("  help        - show this help");
      console.log("  exit        - quit QUICK shell\n");
      rl.prompt();
      return;
    }

    if (input.startsWith("up ")) {
      const [, portStr] = input.split(/\s+/, 2);
      const port = Number.parseInt(portStr, 10);
      if (!Number.isFinite(port) || port <= 0 || port > 65535) {
        console.error(
          chalk.red("Port must be a number between 1 and 65535.")
        );
        rl.prompt();
        return;
      }

      closeTunnel();
      currentTunnel = await startTunnelFlow(port, {
        stayUntilCtrlC: false,
        fromShell: true,
      });
      if (!currentTunnel) {
        console.log(
          chalk.dim("No tunnel running. Use `up <port>` to try again.")
        );
      } else {
        console.log(
          chalk.dim(
            "Tunnel is live. Type `exit` to close QUICK, or `up <port>` to restart on a different port."
          )
        );
      }
      rl.prompt();
      return;
    }

    console.log(
      chalk.red(
        `Unknown command: ${input}. Try 'up <port>', 'help', or 'exit'.`
      )
    );
    rl.prompt();
  });

  rl.on("SIGINT", () => {
    // Ctrl+C inside the shell should behave like exit.
    closeTunnel();
    showOutro("Goodbye.");
    rl.close();
    process.exit(0);
  });

  rl.prompt();
}

