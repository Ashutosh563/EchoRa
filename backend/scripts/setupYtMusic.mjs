import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const python = process.env.YT_MUSIC_PYTHON || process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const windowsVenvPython = path.join(root, ".venv", "Scripts", "python.exe");
const posixVenvPython = path.join(root, ".venv", "bin", process.platform === "win32" ? "python.exe" : "python");
const venvPython = existsSync(windowsVenvPython) ? windowsVenvPython : posixVenvPython;

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(python, ["-m", "venv", path.join(root, ".venv")]);
run(venvPython, ["-m", "pip", "install", "-r", path.join(root, "requirements.txt")]);
console.log(`ytmusicapi installed in ${path.join(root, ".venv")}`);
