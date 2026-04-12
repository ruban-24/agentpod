import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { detectVerifyCommands, detectProvisioning, detectProjectType, detectRunConfig, detectMonorepo } from '../../config/auto-detect.js';
import { AGEX_DIR, CONFIG_FILE } from '../../constants.js';
import type { RunConfig } from '../../types.js';
import { bold, blue, green, dim, yellow } from '../format/colors.js';
import { confirm, editField, editList, multiSelect, singleSelect, type PromptIO, type SelectOption } from '../interactive.js';
import { AGENT_LABELS, VALID_AGENT_IDS, type AgentId } from '../skill-writer.js';
import { initCommand, TEMPLATE_CONFIG, type InitResult } from './init.js';

const MONOREPO_GUIDANCE = `  Monorepos need manual configuration. Edit ${bold('.agex/config.yml')} to add:
    ${dim('verify:')}   test/lint/build commands scoped to your package(s)
    ${dim('copy:')}     files like .env that aren't in git
    ${dim('setup:')}    install commands for worktree provisioning
  Avoid symlinking node_modules in monorepos with hoisted dependencies.
`;

export async function interactiveInit(
  repoRoot: string,
  io?: PromptIO,
): Promise<InitResult> {
  const write = (text: string) => {
    if (io) {
      io.output.write(text);
    } else {
      process.stdout.write(text);
    }
  };

  // 1. Check for monorepo
  const monorepo = await detectMonorepo(repoRoot);
  const isMonorepo = monorepo !== null;

  // 2. Detect project type
  const projectType = await detectProjectType(repoRoot);
  if (projectType) {
    write(`\n  ${bold('Detected project:')} ${blue(projectType)}\n`);
  }

  let verify: string[] = [];
  let copy: string[] | undefined;
  let symlink: string[] | undefined;
  let setup: string[] | undefined;
  let run: RunConfig | undefined;

  if (isMonorepo) {
    // Path A: Monorepo — guidance + template config, skip detection
    write(`\n  ${bold('Detected monorepo:')} ${yellow(monorepo.label)}\n\n`);
    write(MONOREPO_GUIDANCE);
    write('\n');
  } else {
    // Path B: Regular project — tri-choice
    const choice = await singleSelect<'auto' | 'customize' | 'skip'>(
      bold('How would you like to configure?'),
      [
        { label: 'Auto-configure (accept detected defaults)', value: 'auto' },
        { label: 'Customize (step through each setting)', value: 'customize' },
        { label: 'Skip (create workspace only, no config)', value: 'skip' },
      ],
      io,
    );

    if (choice === 'auto') {
      // Auto-configure: run all detection, accept defaults
      verify = await detectVerifyCommands(repoRoot);
      const provisioning = await detectProvisioning(repoRoot);
      copy = provisioning.copy;
      // Safety: drop symlink when setup is present to prevent shared mutation across parallel worktrees
      symlink = provisioning.setup?.length ? undefined : provisioning.symlink;
      setup = provisioning.setup;
      run = (await detectRunConfig(repoRoot)) ?? undefined;
    } else if (choice === 'customize') {
      // Customize: step through each setting interactively
      ({ verify, copy, symlink, setup, run } = await customizeFlow(repoRoot, write, io));
    }
    // 'skip' → everything stays empty
  }

  // Agent selection (both paths)
  write(`\n  ${bold('Which agents do you use?')}\n`);
  write(`  ${dim('Agent-specific skills and session hooks will be configured')}\n`);

  const agentOptions: SelectOption<AgentId>[] = VALID_AGENT_IDS.map((id) => ({
    label: AGENT_LABELS[id],
    value: id,
  }));

  const agents = await multiSelect(agentOptions, io);

  // Call initCommand
  const result = await initCommand(repoRoot, {
    verify: verify.length > 0 ? verify : undefined,
    copy,
    symlink,
    setup,
    run,
    agents: agents.length > 0 ? agents : undefined,
  });

  // Monorepo: write template config if initCommand didn't create one
  if (isMonorepo && !result.files.includes('.agex/config.yml')) {
    await writeFile(join(repoRoot, AGEX_DIR, CONFIG_FILE), TEMPLATE_CONFIG);
    result.files.push('.agex/config.yml');
  }

  // Override verify in result to always reflect what user chose (including empty)
  return {
    ...result,
    verify,
    agents,
  };
}

async function customizeFlow(
  repoRoot: string,
  write: (text: string) => void,
  io?: PromptIO,
): Promise<{
  verify: string[];
  copy: string[] | undefined;
  symlink: string[] | undefined;
  setup: string[] | undefined;
  run: RunConfig | undefined;
}> {
  // 1. Detect verify commands
  const detectedVerify = await detectVerifyCommands(repoRoot);
  let verify: string[] = [];

  if (detectedVerify.length > 0) {
    write(`\n  ${bold('Verify commands')} ${dim('(auto-detected)')}\n`);
    write(`  ${dim('Commands agents run to check their work before finishing')}\n`);
    for (const cmd of detectedVerify) {
      write(`    ${green('\u2713')} ${cmd}\n`);
    }
    write('\n');

    const answer = await confirm('Use these verify commands?', { allowEdit: true }, io);

    if (answer === 'yes') {
      verify = detectedVerify;
    } else if (answer === 'edit') {
      verify = await editList(detectedVerify, io);
    }
    // 'no' → verify stays empty
  } else {
    write(`\n  ${dim('No verify commands detected.')}\n\n`);
    verify = await editList([], io);
  }

  // 2. Detect provisioning
  const provisioning = await detectProvisioning(repoRoot);
  const hasProvisioning = provisioning.copy?.length || provisioning.symlink?.length || provisioning.setup?.length;

  let copy: string[] | undefined;
  let symlink: string[] | undefined;
  let setup: string[] | undefined;

  if (hasProvisioning) {
    write(`\n  ${bold('Workspace provisioning')} ${dim('(auto-detected)')}\n`);
    write(`  ${dim('How each task worktree gets its dependencies')}\n`);
    if (provisioning.copy?.length) {
      write(`    ${dim('copy:')}    ${provisioning.copy.join(', ')}  ${dim('- copied into each worktree')}\n`);
    }
    if (provisioning.symlink?.length) {
      write(`    ${dim('symlink:')} ${provisioning.symlink.join(', ')}  ${dim('- shared via symlink')}\n`);
    }
    if (provisioning.setup?.length) {
      write(`    ${dim('setup:')}   ${provisioning.setup.join(', ')}  ${dim('- runs after worktree creation')}\n`);
    }
    write('\n');

    const answer = await confirm('Use this provisioning config?', {}, io);

    if (answer === 'yes') {
      copy = provisioning.copy;
      symlink = provisioning.symlink;
      setup = provisioning.setup;
    }
    // 'no' → skip provisioning
  }
  // If none detected → skip silently

  // 3. Detect run config
  const detectedRun = await detectRunConfig(repoRoot);
  let run: RunConfig | undefined;

  if (detectedRun) {
    write(`\n  ${bold('Dev server')} ${dim('(auto-detected)')}\n`);
    write(`  ${dim('Server started per-task so agents can test against it')}\n`);
    write(`    ${dim('cmd:')}      ${detectedRun.cmd}\n`);
    if (detectedRun.port_env) {
      write(`    ${dim('port_env:')} ${detectedRun.port_env}  ${dim('- env var set to an available port')}\n`);
    }
    write('\n');

    const answer = await confirm('Use this run config?', { allowEdit: true }, io);

    if (answer === 'yes') {
      run = detectedRun;
    } else if (answer === 'edit') {
      const cmd = await editField('cmd', detectedRun.cmd, io);
      const portEnv = await editField('port_env', detectedRun.port_env, io);
      if (cmd) {
        run = { cmd, ...(portEnv ? { port_env: portEnv } : {}) };
      }
    }
  }

  return { verify, copy, symlink, setup, run };
}
