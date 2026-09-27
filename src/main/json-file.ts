import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeSync } from "node:fs";
import { dirname } from "node:path";

/** The parsed file, or undefined when it is missing or unreadable. Only a missing file goes unlogged. */
export function readJsonFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      console.error(`Failed to read ${path}:`, error);
    }
    return undefined;
  }
}

/** Writes through a synced temporary file and a rename, so a failed save leaves the previous file whole. */
export function writeJsonFile(path: string, value: unknown) {
  const temporary = `${path}.${process.pid}.tmp`;
  mkdirSync(dirname(path), { recursive: true });
  try {
    const file = openSync(temporary, "w", 0o600);
    try {
      writeSync(file, JSON.stringify(value, null, 2));
      fsyncSync(file);
    } finally {
      closeSync(file);
    }
    renameSync(temporary, path);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
}
