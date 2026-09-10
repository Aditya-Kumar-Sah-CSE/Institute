import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PermissionManager } from './permission-manager';
import { WorkspaceFile } from './types';

export interface CheckpointSnapshot {
  id: string;
  timestamp: number;
  label: string;
  filesBackup: Map<string, string | null>; // file path -> original content (null if did not exist)
}

export class WorkspaceManager {
  private static checkpoints: Map<string, CheckpointSnapshot> = new Map();

  /**
   * Safely reads file content inside workspace root.
   */
  public static async readFile(relativePath: string): Promise<{ success: boolean; content?: string; error?: string }> {
    const safePath = PermissionManager.resolveSafeWorkspacePath(relativePath);
    if (!safePath) {
      return { success: false, error: `Access denied: path "${relativePath}" escapes workspace.` };
    }

    try {
      const content = await fs.readFile(safePath, 'utf-8');
      return { success: true, content };
    } catch (err: any) {
      return { success: false, error: err.message || `File read error: ${relativePath}` };
    }
  }

  /**
   * Recursively lists workspace files filtered by extensions, skipping node_modules/.next.
   */
  public static async listWorkspaceFiles(
    dirRelative: string = 'src',
    maxFiles: number = 100
  ): Promise<string[]> {
    const safePath = PermissionManager.resolveSafeWorkspacePath(dirRelative);
    if (!safePath) return [];

    const root = PermissionManager.getWorkspaceRoot();
    const result: string[] = [];

    const walk = async (currentDir: string) => {
      if (result.length >= maxFiles) return;

      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (result.length >= maxFiles) break;

          const entryPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            if (['node_modules', '.next', '.git', 'agent-workspace', 'dist', 'build'].includes(entry.name)) {
              continue;
            }
            await walk(entryPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (['.ts', '.tsx', '.js', '.jsx', '.json', '.css'].includes(ext)) {
              const rel = path.relative(root, entryPath).replace(/\\/g, '/');
              result.push(rel);
            }
          }
        }
      } catch (err) {
        console.warn(`[WorkspaceManager] Directory scan error:`, err);
      }
    };

    await walk(safePath);
    return result;
  }

  /**
   * Creates or overwrites a file inside workspace.
   */
  public static async writeFile(relativePath: string, content: string): Promise<{ success: boolean; error?: string }> {
    const safePath = PermissionManager.resolveSafeWorkspacePath(relativePath);
    if (!safePath) {
      return { success: false, error: `Access denied: path "${relativePath}" escapes workspace.` };
    }

    try {
      await fs.mkdir(path.dirname(safePath), { recursive: true });
      await fs.writeFile(safePath, content, 'utf-8');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || `File write failed for ${relativePath}` };
    }
  }

  /**
   * Deletes a file inside workspace.
   */
  public static async deleteFile(relativePath: string): Promise<{ success: boolean; error?: string }> {
    const safePath = PermissionManager.resolveSafeWorkspacePath(relativePath);
    if (!safePath) {
      return { success: false, error: `Access denied: path "${relativePath}" escapes workspace.` };
    }

    try {
      await fs.unlink(safePath);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || `File deletion failed for ${relativePath}` };
    }
  }

  /**
   * Creates a backup checkpoint snapshot of specific target files before modification.
   */
  public static async createCheckpoint(label: string, filePaths: string[]): Promise<string> {
    const checkpointId = `chk_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const backupMap = new Map<string, string | null>();

    for (const filePath of filePaths) {
      const read = await this.readFile(filePath);
      backupMap.set(filePath, read.success && read.content !== undefined ? read.content : null);
    }

    this.checkpoints.set(checkpointId, {
      id: checkpointId,
      timestamp: Date.now(),
      label,
      filesBackup: backupMap
    });

    return checkpointId;
  }

  /**
   * Restores workspace files to their exact state at checkpoint creation.
   */
  public static async rollbackCheckpoint(checkpointId: string): Promise<{ success: boolean; restoredCount: number }> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return { success: false, restoredCount: 0 };
    }

    let restoredCount = 0;

    for (const [filePath, originalContent] of checkpoint.filesBackup.entries()) {
      if (originalContent === null) {
        // File didn't exist before checkpoint, delete it
        await this.deleteFile(filePath);
      } else {
        // Restore original file content
        await this.writeFile(filePath, originalContent);
      }
      restoredCount++;
    }

    return { success: true, restoredCount };
  }
}
