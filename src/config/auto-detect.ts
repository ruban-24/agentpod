import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function detectVerifyCommands(repoRoot: string): Promise<string[]> {
  const commands: string[] = [];

  // Check package.json
  const pkgPath = join(repoRoot, 'package.json');
  if (await fileExists(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      const scripts = pkg.scripts || {};
      if (scripts.test) commands.push('npm test');
      if (scripts.lint) commands.push('npm run lint');
      if (scripts.build) commands.push('npm run build');
    } catch {
      // Invalid JSON, skip
    }
  }

  // Check Makefile for test target
  const makefilePath = join(repoRoot, 'Makefile');
  if (await fileExists(makefilePath)) {
    try {
      const content = await readFile(makefilePath, 'utf-8');
      if (/^test\s*:/m.test(content)) {
        commands.push('make test');
      }
    } catch {
      // Skip
    }
  }

  // Check pyproject.toml
  if (await fileExists(join(repoRoot, 'pyproject.toml'))) {
    commands.push('pytest');
  }

  // Check Cargo.toml
  if (await fileExists(join(repoRoot, 'Cargo.toml'))) {
    commands.push('cargo test');
  }

  // Check go.mod
  if (await fileExists(join(repoRoot, 'go.mod'))) {
    commands.push('go test ./...');
  }

  return commands;
}
