import path from 'node:path';

export interface PermissionConfig {
  maxRetries: number;
  allowedCommands: string[];
}

export class PermissionManager {
  private static workspaceRoot: string = process.cwd();
  private static defaultMaxRetries: number = 3;

  private static ALLOWED_COMMANDS: Set<string> = new Set([
    'npm run build',
    'npx tsc --noEmit',
    'npx next build',
    'git status',
    'git diff'
  ]);

  /**
   * Resolves and validates a relative or absolute path against the workspace sandbox.
   * Returns null if path escapes the workspace root.
   */
  public static resolveSafeWorkspacePath(inputPath: string): string | null {
    if (!inputPath || typeof inputPath !== 'string') return null;
    if (inputPath.includes('\0')) return null;

    const normalizedRoot = path.resolve(this.workspaceRoot);
    let resolved: string;

    if (path.isAbsolute(inputPath)) {
      resolved = path.resolve(inputPath);
    } else {
      resolved = path.resolve(normalizedRoot, inputPath);
    }

    const relative = path.relative(normalizedRoot, resolved);
    const isEscaping = relative.startsWith('..') || path.isAbsolute(relative);

    if (isEscaping) {
      console.warn(`[PermissionManager] Security Block: Path "${inputPath}" escapes workspace root "${normalizedRoot}"`);
      return null;
    }

    const pathParts = relative.split(path.sep).map(part => part.toLowerCase());
    const blockedParts = new Set(['.git', 'node_modules', '.next', 'dist', 'build']);
    if (pathParts.some(part => blockedParts.has(part) || part === '.env' || part.startsWith('.env.'))) {
      console.warn(`[PermissionManager] Security Block: Protected path "${inputPath}".`);
      return null;
    }

    return resolved;
  }

  public static isAutonomousFilePathAllowed(inputPath: string): boolean {
    const safePath = this.resolveSafeWorkspacePath(inputPath);
    if (!safePath || path.isAbsolute(inputPath)) return false;

    const relative = path.relative(this.workspaceRoot, safePath).replace(/\\/g, '/').toLowerCase();
    return relative.startsWith('src/') || relative.startsWith('public/');
  }

  /**
   * Verifies if a shell command is in the safe allowlist.
   */
  public static isCommandAllowed(command: string): boolean {
    const cmdClean = command.trim().toLowerCase();
    for (const allowed of this.ALLOWED_COMMANDS) {
      if (cmdClean === allowed || cmdClean.startsWith(allowed)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if maximum retry limit has been exceeded.
   */
  public static isRetryLimitExceeded(currentIteration: number, maxRetries: number = this.defaultMaxRetries): boolean {
    return currentIteration >= maxRetries;
  }

  public static getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }
}
