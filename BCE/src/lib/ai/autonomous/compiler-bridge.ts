import 'server-only';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { WorkspaceManager } from './workspace-manager';
import { ErrorParser } from './error-parser';
import { PermissionManager } from './permission-manager';
import { CompilationResult, DiagnosticError } from './types';

const execAsync = promisify(exec);

export class CompilerBridge {
  // Safe Workspace Filesystem Operations
  public static async readFile(relativePath: string) {
    return WorkspaceManager.readFile(relativePath);
  }

  public static async listFiles(dirRelative: string = 'src', maxFiles: number = 100) {
    return WorkspaceManager.listWorkspaceFiles(dirRelative, maxFiles);
  }

  public static async createFile(relativePath: string, content: string) {
    return WorkspaceManager.writeFile(relativePath, content);
  }

  public static async updateFile(relativePath: string, content: string) {
    return WorkspaceManager.writeFile(relativePath, content);
  }

  public static async deleteFile(relativePath: string) {
    return WorkspaceManager.deleteFile(relativePath);
  }

  /**
   * Performs fast type-checking / diagnostic checking using `npx tsc --noEmit`.
   */
  public static async getDiagnostics(): Promise<CompilationResult> {
    const root = PermissionManager.getWorkspaceRoot();
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
        cwd: root,
        timeout: 20000,
        maxBuffer: 2 * 1024 * 1024
      });

      const rawOutput = (stdout || '') + '\n' + (stderr || '');
      const diagnostics = ErrorParser.parseCompilerOutput(rawOutput);

      return {
        success: diagnostics.filter(d => d.severity === 'error').length === 0,
        diagnostics,
        rawOutput,
        exitCode: 0
      };
    } catch (err: any) {
      const rawOutput = (err.stdout || '') + '\n' + (err.stderr || err.message || '');
      const diagnostics = ErrorParser.parseCompilerOutput(rawOutput);

      return {
        success: false,
        diagnostics,
        rawOutput,
        exitCode: err.code || 1
      };
    }
  }

  /**
   * Executes complete Next.js build compilation for final verification.
   */
  public static async compile(): Promise<CompilationResult> {
    const root = PermissionManager.getWorkspaceRoot();
    try {
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: root,
        timeout: 90000,
        maxBuffer: 5 * 1024 * 1024
      });

      const rawOutput = (stdout || '') + '\n' + (stderr || '');
      const diagnostics = ErrorParser.parseCompilerOutput(rawOutput);

      return {
        success: diagnostics.filter(d => d.severity === 'error').length === 0,
        diagnostics,
        rawOutput,
        exitCode: 0
      };
    } catch (err: any) {
      const rawOutput = (err.stdout || '') + '\n' + (err.stderr || err.message || '');
      const diagnostics = ErrorParser.parseCompilerOutput(rawOutput);

      return {
        success: false,
        diagnostics,
        rawOutput,
        exitCode: err.code || 1
      };
    }
  }

  /**
   * Runs automated unit/integration tests if configured.
   */
  public static async test(): Promise<{ success: boolean; output: string }> {
    const root = PermissionManager.getWorkspaceRoot();
    try {
      const { stdout, stderr } = await execAsync('npm test', {
        cwd: root,
        timeout: 30000
      });
      return { success: true, output: stdout || stderr };
    } catch (err: any) {
      return { success: false, output: err.message };
    }
  }
}
