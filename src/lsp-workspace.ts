import fs from "fs";
import path from "path";

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "coverage", "target"]);

export async function collectIrisFiles(rootPath: string): Promise<string[]> {
  const results: string[] = [];
  await walk(rootPath, results);
  return results;
}

async function walk(dirPath: string, results: string[]): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await walk(fullPath, results);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".iris")) {
      results.push(fullPath);
    }
  }
}
