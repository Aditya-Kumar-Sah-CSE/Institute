import { WorkspaceManager } from './workspace-manager';
import { PermissionManager } from './permission-manager';
import { WorkspaceFile, CodePatch } from './types';

export class PatchManager {
  /**
   * Applies a set of workspace file changes (create, modify, delete).
   */
  public static async applyWorkspaceFiles(files: WorkspaceFile[]): Promise<{
    success: boolean;
    appliedPaths: string[];
    errors: string[];
  }> {
    const appliedPaths: string[] = [];
    const errors: string[] = [];

    const invalidPaths = files
      .filter(file => !PermissionManager.isAutonomousFilePathAllowed(file.path))
      .map(file => `Access denied for autonomous path: ${file.path}`);
    if (invalidPaths.length > 0) {
      return { success: false, appliedPaths, errors: invalidPaths };
    }

    for (const file of files) {
      if (file.action === 'delete') {
        const res = await WorkspaceManager.deleteFile(file.path);
        if (res.success) {
          appliedPaths.push(file.path);
        } else {
          errors.push(res.error || `Failed to delete ${file.path}`);
        }
      } else {
        if (file.content === undefined) {
          errors.push(`Missing content for ${file.action} on ${file.path}`);
          continue;
        }

        const res = await WorkspaceManager.writeFile(file.path, file.content);
        if (res.success) {
          appliedPaths.push(file.path);
        } else {
          errors.push(res.error || `Failed to ${file.action} ${file.path}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      appliedPaths,
      errors
    };
  }

  /**
   * Applies code patches generated during error repair loop.
   */
  public static async applyCodePatches(patches: CodePatch[]): Promise<{
    success: boolean;
    appliedPaths: string[];
    errors: string[];
  }> {
    const workspaceFiles: WorkspaceFile[] = patches.map(p => ({
      path: p.path,
      action: p.action,
      content: p.content || p.replacementContent
    }));

    return this.applyWorkspaceFiles(workspaceFiles);
  }
}
