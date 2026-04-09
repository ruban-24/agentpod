import simpleGit from 'simple-git';
import type { DiffStats } from '../types.js';

export interface CommitLogEntry {
  sha: string;
  message: string;
}

export interface FileStats {
  file: string;
  insertions: number;
  deletions: number;
  status: string; // A, M, D, R, etc.
}

export class Reviewer {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  async getDiff(branch: string): Promise<DiffStats> {
    const git = simpleGit(this.repoRoot);

    try {
      // Find the merge base
      const base = await git.raw(['merge-base', 'HEAD', branch]);
      const baseSha = base.trim();

      // Get diff stats using numstat format
      const stat = await git.raw(['diff', '--numstat', baseSha, branch]);

      if (!stat.trim()) {
        return { files_changed: 0, insertions: 0, deletions: 0 };
      }

      let filesChanged = 0;
      let insertions = 0;
      let deletions = 0;

      for (const line of stat.trim().split('\n')) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          filesChanged++;
          const added = parseInt(parts[0], 10);
          const removed = parseInt(parts[1], 10);
          if (!isNaN(added)) insertions += added;
          if (!isNaN(removed)) deletions += removed;
        }
      }

      return { files_changed: filesChanged, insertions, deletions };
    } catch {
      return { files_changed: 0, insertions: 0, deletions: 0 };
    }
  }

  async getDiffText(branch: string): Promise<string> {
    const git = simpleGit(this.repoRoot);

    try {
      const base = await git.raw(['merge-base', 'HEAD', branch]);
      return await git.raw(['diff', base.trim(), branch]);
    } catch {
      return '';
    }
  }

  async merge(branch: string): Promise<{ success: boolean; strategy?: string; commit?: string }> {
    const git = simpleGit(this.repoRoot);

    try {
      // Try fast-forward first
      try {
        await git.raw(['merge', '--ff-only', branch]);
        const commit = (await git.raw(['rev-parse', 'HEAD'])).trim();
        return { success: true, strategy: 'fast-forward', commit };
      } catch {
        // Not fast-forwardable, try regular merge
      }

      const output = await git.raw(['merge', branch, '-m', `Merge ${branch}`]);

      // simple-git raw() may not throw on merge conflicts; check output
      if (output && output.includes('CONFLICT')) {
        try {
          await git.raw(['merge', '--abort']);
        } catch {
          // May not be in a merge state
        }
        return { success: false };
      }

      const commit = (await git.raw(['rev-parse', 'HEAD'])).trim();
      return { success: true, strategy: 'merge', commit };
    } catch {
      // Abort failed merge
      try {
        await git.raw(['merge', '--abort']);
      } catch {
        // May not be in a merge state
      }
      return { success: false };
    }
  }

  async getCommitLog(branch: string): Promise<CommitLogEntry[]> {
    const git = simpleGit(this.repoRoot);

    try {
      const base = await git.raw(['merge-base', 'HEAD', branch]);
      const baseSha = base.trim();
      const output = await git.raw(['log', '--oneline', `${baseSha}..${branch}`]);

      if (!output.trim()) return [];

      return output.trim().split('\n').map((line) => {
        const spaceIndex = line.indexOf(' ');
        return {
          sha: line.slice(0, spaceIndex),
          message: line.slice(spaceIndex + 1),
        };
      });
    } catch {
      return [];
    }
  }

  async getPerFileStats(branch: string): Promise<FileStats[]> {
    const git = simpleGit(this.repoRoot);

    try {
      const base = await git.raw(['merge-base', 'HEAD', branch]);
      const baseSha = base.trim();

      // Get per-file stats
      const numstat = await git.raw(['diff', '--numstat', baseSha, branch]);
      // Get file status (A/M/D)
      const nameStatus = await git.raw(['diff', '--name-status', baseSha, branch]);

      if (!numstat.trim()) return [];

      // Parse name-status for A/M/D indicators
      const statusMap = new Map<string, string>();
      for (const line of nameStatus.trim().split('\n')) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          statusMap.set(parts[parts.length - 1], parts[0]);
        }
      }

      // Parse numstat for per-file counts
      return numstat.trim().split('\n').map((line) => {
        const parts = line.split('\t');
        if (parts.length < 3) return null;
        const file = parts[2];
        return {
          file,
          insertions: parseInt(parts[0], 10) || 0,
          deletions: parseInt(parts[1], 10) || 0,
          status: statusMap.get(file) || 'M',
        };
      }).filter((entry): entry is FileStats => entry !== null);
    } catch {
      return [];
    }
  }
}
