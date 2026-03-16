import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

const CONFIG_PATH = path.join(os.homedir(), ".quick.json");

export async function readConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeConfig(next) {
  const safe = next && typeof next === "object" ? next : {};
  await fs.writeFile(CONFIG_PATH, JSON.stringify(safe, null, 2) + "\n", "utf8");
}

