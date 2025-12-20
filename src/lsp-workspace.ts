import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "coverage", "target"]);

export async function collectIrisFiles(rootPath: string): Promise<string[]> {
  const results: string[] = [];
  await walk(rootPath, results);
  return results;
}

export function uriToPath(uri: string): string | null {
  if (uri.startsWith("file://")) {
    try {
      return fileURLToPath(uri);
    } catch {
      return null;
    }
  }
  return uri;
}

export function resolveImportFile(
  importPath: string,
  baseFilePath: string,
  workspaceRoots: string[],
): string | null {
  const withExt = importPath.endsWith(".iris")
    ? importPath
    : `${importPath}.iris`;

  if (path.isAbsolute(withExt)) {
    return fileExists(withExt) ? withExt : null;
  }

  const local = path.join(path.dirname(baseFilePath), withExt);
  if (fileExists(local)) return local;

  for (const root of workspaceRoots) {
    const candidate = path.join(root, withExt);
    if (fileExists(candidate)) return candidate;
  }

  return null;
}

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
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
