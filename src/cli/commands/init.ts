import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dump } from 'js-yaml';
import { AGENTPOD_DIR, TASKS_DIR, WORKTREES_DIR, CONFIG_FILE } from '../../constants.js';
import type { AgentpodConfig } from '../../types.js';
import { type AgentId, writeSkillFiles } from '../skill-writer.js';

export interface InitOptions {
  verify?: string[];
  copy?: string[];
  symlink?: string[];
  setup?: string[];
  agents?: AgentId[];
}

export interface InitResult {
  created: boolean;
  files: string[];
  verify: string[];
  agents: AgentId[];
}

export async function initCommand(
  repoRoot: string,
  options: InitOptions
): Promise<InitResult> {
  const agentpodDir = join(repoRoot, AGENTPOD_DIR);
  const files: string[] = [];

  // Create directories
  await mkdir(join(agentpodDir, TASKS_DIR), { recursive: true });
  await mkdir(join(agentpodDir, WORKTREES_DIR), { recursive: true });

  // Handle .gitignore
  const gitignorePath = join(repoRoot, '.gitignore');
  let gitignoreContent = '';
  try {
    gitignoreContent = await readFile(gitignorePath, 'utf-8');
  } catch {
    // File doesn't exist
  }

  if (!gitignoreContent.includes('.agentpod/')) {
    gitignoreContent = gitignoreContent.trimEnd() + '\n.agentpod/\n';
    await writeFile(gitignorePath, gitignoreContent);
  }

  // Write config.yml with all config fields (verify + provisioning)
  const hasConfig = options.verify?.length || options.copy?.length ||
    options.symlink?.length || options.setup?.length;

  if (hasConfig) {
    const config: AgentpodConfig = {};
    if (options.verify?.length) config.verify = options.verify;
    if (options.copy?.length) config.copy = options.copy;
    if (options.symlink?.length) config.symlink = options.symlink;
    if (options.setup?.length) config.setup = options.setup;
    await writeFile(join(agentpodDir, CONFIG_FILE), dump(config));
    files.push('.agentpod/config.yml');
  }

  // Write skill files for selected agents
  const agents = options.agents ?? [];
  if (agents.length > 0) {
    const skillFiles = await writeSkillFiles(repoRoot, agents);
    files.push(...skillFiles);
  }

  return {
    created: true,
    files,
    verify: options.verify ?? [],
    agents,
  };
}
