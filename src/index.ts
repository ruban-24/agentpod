import { Command } from 'commander';
import { resolve } from 'node:path';
import { initCommand } from './cli/commands/init.js';
import { taskCreateCommand } from './cli/commands/task-create.js';
import { taskStatusCommand } from './cli/commands/task-status.js';
import { formatOutput } from './cli/output.js';

const program = new Command();

program
  .name('agentpod')
  .description('A CLI runtime for running parallel AI coding tasks safely inside real repos')
  .version('0.1.0');

function getRepoRoot(): string {
  return resolve(process.cwd());
}

program
  .command('init')
  .description('Initialize agentpod in the current repository')
  .option('--verify <commands...>', 'Verification commands to run')
  .option('--human', 'Human-friendly output', false)
  .action(async (opts) => {
    const result = await initCommand(getRepoRoot(), { verify: opts.verify });
    console.log(formatOutput(result, opts.human));
  });

const taskCmd = program.command('task').description('Task management commands');

taskCmd
  .command('create')
  .description('Create a new task with an isolated workspace')
  .requiredOption('--prompt <prompt>', 'Description of the task')
  .option('--cmd <cmd>', 'Command to execute (optional)')
  .option('--human', 'Human-friendly output', false)
  .action(async (opts) => {
    const result = await taskCreateCommand(getRepoRoot(), {
      prompt: opts.prompt,
      cmd: opts.cmd,
    });
    console.log(formatOutput(result, opts.human));
  });

taskCmd
  .command('status <id>')
  .description('Get detailed status for a task')
  .option('--human', 'Human-friendly output', false)
  .action(async (id, opts) => {
    const result = await taskStatusCommand(getRepoRoot(), id);
    console.log(formatOutput(result, opts.human));
  });

program.parse();
