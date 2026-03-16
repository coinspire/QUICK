import { intro, outro, spinner, note } from "@clack/prompts";
import boxen from "boxen";
import chalk from "chalk";
import gradient from "gradient-string";

const BRAND_GRADIENT = gradient(["#a855f7", "#4f46e5"]); // purple -> indigo

export function showIntro() {
  // clack's `intro()` is great for plain text, but it can mangle multi-line ANSI.
  // Print the logo ourselves, then use clack for the rest of the UI.
  console.log("\n" + BRAND_GRADIENT.multiline(logo()) + "\n");
  // On some Windows terminals, clack's `intro()` box characters can render incorrectly.
  // A note keeps the "clack vibe" without depending on box drawing glyph support.
  note(chalk.dim("Share your local server instantly."), "QUICK");
}

export function showOutro(message = "Stopped sharing.") {
  outro(chalk.dim(message));
}

export function startConnectingSpinner() {
  const s = spinner();
  s.start("✨ Creating your magic link...");
  return s;
}

export function showUrlBox(url) {
  const content = [
    chalk.bold(url),
    "",
    chalk.hex("#a855f7").bold("Link copied to clipboard!"),
  ].join("\n");

  // Thick border feel: "double" + extra padding.
  // boxen borderColor doesn't support hex reliably; use close-enough named color.
  // The content itself carries the brand hex.
  return boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: "double",
    borderColor: "magenta",
  });
}

export function showErrorBox(message) {
  return boxen(chalk.red.bold(message), {
    padding: 1,
    margin: 1,
    borderStyle: "round",
    borderColor: "red",
  });
}

export function showKeepAliveHint() {
  note(chalk.dim("Press Ctrl+C to stop sharing"), "Sharing active");
}

export function showCommandsOverview() {
  const heading = chalk.hex("#a855f7").bold("QUICK COMMANDS");
  const lines = [
    heading,
    "",
    `${chalk.bold("quick up --port <port>")}  Share a local dev server`,
    `${chalk.bold("quick --help")}           Show detailed help`,
    `${chalk.bold("exit")}                   Quit QUICK shell (when inside)`,
  ];
  console.log("\n" + lines.join("\n") + "\n");
}

function logo() {
  // Big, readable wordmark without extra deps (figlet).
  return [
    "██████╗  ██╗   ██╗██╗ ██████╗██╗  ██╗",
    "██╔═══██╗██║   ██║██║██╔════╝██║ ██╔╝",
    "██║   ██║██║   ██║██║██║     █████╔╝ ",
    "██║▄▄ ██║██║   ██║██║██║     ██╔═██╗ ",
    "╚██████╔╝╚██████╔╝██║╚██████╗██║  ██╗",
    "╚══▀▀═╝   ╚═════╝ ╚═╝ ╚═════╝╚═╝   ╚═╝",
  ].join("\n");
}

