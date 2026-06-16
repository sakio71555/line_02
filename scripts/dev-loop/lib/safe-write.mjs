import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve, sep } from "node:path";

export function resolveProjectOutputPath(repoRoot, outputPath) {
  if (!outputPath || typeof outputPath !== "string") {
    throw new Error("output path is required");
  }

  const root = resolve(repoRoot);
  const target = isAbsolute(outputPath)
    ? resolve(outputPath)
    : resolve(root, outputPath);
  const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;

  if (target !== root && !target.startsWith(rootPrefix)) {
    throw new Error(`refusing to write outside project: ${outputPath}`);
  }

  if (basename(target).startsWith(".env")) {
    throw new Error("refusing to write env-like files");
  }

  return target;
}

export function writeProjectFile(repoRoot, outputPath, contents) {
  const target = resolveProjectOutputPath(repoRoot, outputPath);
  const parent = dirname(target);

  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }

  writeFileSync(target, contents, "utf8");
  return target;
}
