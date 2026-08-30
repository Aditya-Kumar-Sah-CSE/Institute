import { SupabaseClient } from '@supabase/supabase-js';

export interface DBFileItem {
  id?: string;
  student_id?: string;
  path: string;
  kind: 'file' | 'directory';
  content: string;
  updated_at?: string;
}

export interface ClientFileItem {
  name: string;
  path: string; // relative path from root, e.g. "CP/Leetcode/main.cpp"
  kind: 'file' | 'directory';
  children?: ClientFileItem[];
  content?: string;
  isDirty?: boolean;
}

const DEFAULT_STARTERS = {
  cpp17: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, BCE Code Arena!" << endl;\n    return 0;\n}`,
  java: `class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, BCE Code Arena!");\n    }\n}`,
  python: `def solve():\n    print("Hello, BCE Code Arena!")\n\nsolve()\n`,
  html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>React & HTML Sandbox</title>\n</head>\n<body>\n  <h1>Hello, React & HTML Sandbox!</h1>\n</body>\n</html>`,
  javascript: `'use strict';\n\nfunction solve() {\n    console.log('Hello, BCE Code Arena!');\n}\n\nsolve();\n`
};

// Normalize and validate path to prevent path traversal
export function cleanAndValidatePath(rawPath: string): string {
  // If it starts with ~/workspace or /workspace, strip it
  let cleaned = rawPath.replace(/^(~\/workspace|\/workspace)/, '');
  
  // Replace backslashes with forward slashes
  cleaned = cleaned.replace(/\\/g, '/');
  
  // Split parts and resolve path segments (simulating path.resolve traversal protection)
  const parts = cleaned.split('/');
  const resolvedParts: string[] = [];
  
  for (const part of parts) {
    if (part === '' || part === '.') {
      continue;
    }
    if (part === '..') {
      if (resolvedParts.length === 0) {
        throw new Error('Access denied: Path traversal escape attempt detected.');
      }
      resolvedParts.pop();
    } else {
      resolvedParts.push(part);
    }
  }
  
  return resolvedParts.join('/');
}

// Format relative path back to user-facing path starting with ~/workspace
export function toUserFacingPath(relativePath: string): string {
  const clean = relativePath.trim();
  if (clean === '') return '~/workspace';
  return `~/workspace/${clean}`;
}

// Initialize default files in the database if the workspace is empty
export async function initWorkspaceIfNeeded(supabase: SupabaseClient, studentId: string): Promise<void> {
  const { data, error } = await supabase
    .from('student_workspace_files')
    .select('id')
    .eq('student_id', studentId)
    .limit(1);
    
  if (error) {
    throw new Error(`Database error verifying workspace: ${error.message}`);
  }
  
  if (!data || data.length === 0) {
    // Populate default files
    const defaultFiles: DBFileItem[] = [
      { path: 'main.cpp', kind: 'file', content: DEFAULT_STARTERS.cpp17 },
      { path: 'Main.java', kind: 'file', content: DEFAULT_STARTERS.java },
      { path: 'solve.py', kind: 'file', content: DEFAULT_STARTERS.python },
      { path: 'index.html', kind: 'file', content: DEFAULT_STARTERS.html },
      { path: 'script.js', kind: 'file', content: DEFAULT_STARTERS.javascript },
    ];
    
    const rows = defaultFiles.map(file => ({
      student_id: studentId,
      path: file.path,
      kind: file.kind,
      content: file.content
    }));
    
    const { error: insertError } = await supabase
      .from('student_workspace_files')
      .insert(rows);
      
    if (insertError) {
      throw new Error(`Failed to initialize default files: ${insertError.message}`);
    }
  }
}

// Get tree representation of workspace files
export async function getWorkspaceTree(supabase: SupabaseClient, studentId: string): Promise<ClientFileItem[]> {
  await initWorkspaceIfNeeded(supabase, studentId);
  
  const { data, error } = await supabase
    .from('student_workspace_files')
    .select('path, kind, content')
    .eq('student_id', studentId);
    
  if (error) {
    throw new Error(`Failed to load workspace files: ${error.message}`);
  }
  
  const files = (data || []) as DBFileItem[];
  
  // Build a tree of files and directories
  const rootItems: ClientFileItem[] = [];
  const map: Record<string, ClientFileItem> = {};
  
  // Sort files by path length first, so parents are created before children
  const sortedFiles = [...files].sort((a, b) => a.path.split('/').length - b.path.split('/').length);
  
  for (const file of sortedFiles) {
    const parts = file.path.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, parts.length - 1).join('/');
    
    const item: ClientFileItem = {
      name,
      path: file.path,
      kind: file.kind,
    };
    
    if (file.kind === 'file') {
      item.content = file.content;
    } else {
      item.children = [];
    }
    
    map[file.path] = item;
    
    if (parentPath === '') {
      rootItems.push(item);
    } else {
      const parent = map[parentPath];
      if (parent && parent.children) {
        parent.children.push(item);
      } else {
        // Fallback: if parent directory row is missing, insert in root or auto-create parent
        rootItems.push(item);
      }
    }
  }
  
  // Recursive sorting helper: directories first, then alphabetically by name
  const sortTree = (nodes: ClientFileItem[]) => {
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) {
        sortTree(node.children);
      }
    }
  };
  
  sortTree(rootItems);
  return rootItems;
}

// Read a single file's content
export async function readWorkspaceFile(supabase: SupabaseClient, studentId: string, rawPath: string): Promise<string> {
  const path = cleanAndValidatePath(rawPath);
  
  const { data, error } = await supabase
    .from('student_workspace_files')
    .select('content, kind')
    .eq('student_id', studentId)
    .eq('path', path)
    .single();
    
  if (error || !data) {
    throw new Error(`File not found: ${toUserFacingPath(path)}`);
  }
  
  if (data.kind !== 'file') {
    throw new Error(`Path is a directory: ${toUserFacingPath(path)}`);
  }
  
  return data.content;
}

// Write/Save file contents
export async function writeWorkspaceFile(supabase: SupabaseClient, studentId: string, rawPath: string, content: string): Promise<void> {
  const path = cleanAndValidatePath(rawPath);
  
  // Upsert file
  const { error } = await supabase
    .from('student_workspace_files')
    .upsert({
      student_id: studentId,
      path,
      kind: 'file',
      content,
      updated_at: new Date().toISOString()
    }, { onConflict: 'student_id,path' });
    
  if (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
}

// Create file or folder
export async function createWorkspaceItem(supabase: SupabaseClient, studentId: string, rawPath: string, kind: 'file' | 'directory'): Promise<void> {
  const path = cleanAndValidatePath(rawPath);
  
  // Check if item already exists
  const { data: existing } = await supabase
    .from('student_workspace_files')
    .select('id')
    .eq('student_id', studentId)
    .eq('path', path)
    .maybeSingle();
    
  if (existing) {
    throw new Error(`Item already exists: ${toUserFacingPath(path)}`);
  }
  
  // Insert item
  const { error } = await supabase
    .from('student_workspace_files')
    .insert({
      student_id: studentId,
      path,
      kind,
      content: kind === 'file' ? '' : ''
    });
    
  if (error) {
    throw new Error(`Failed to create item: ${error.message}`);
  }
}

// Rename/move file or folder
export async function renameWorkspaceItem(supabase: SupabaseClient, studentId: string, oldRawPath: string, newRawPath: string): Promise<void> {
  const oldPath = cleanAndValidatePath(oldRawPath);
  const newPath = cleanAndValidatePath(newRawPath);
  
  if (oldPath === newPath) return;
  
  // Verify item exists
  const { data: item, error: getError } = await supabase
    .from('student_workspace_files')
    .select('kind')
    .eq('student_id', studentId)
    .eq('path', oldPath)
    .single();
    
  if (getError || !item) {
    throw new Error(`Source not found: ${toUserFacingPath(oldPath)}`);
  }
  
  if (item.kind === 'file') {
    // Simply rename file
    const { error: renameError } = await supabase
      .from('student_workspace_files')
      .update({ path: newPath, updated_at: new Date().toISOString() })
      .eq('student_id', studentId)
      .eq('path', oldPath);
      
    if (renameError) {
      throw new Error(`Rename failed: ${renameError.message}`);
    }
  } else {
    // It's a directory. We need to rename the directory itself and update paths of all its nested children!
    const { data: allItems, error: listError } = await supabase
      .from('student_workspace_files')
      .select('path, kind, content')
      .eq('student_id', studentId);
      
    if (listError || !allItems) {
      throw new Error(`Failed to list items for directory rename`);
    }
    
    // Find all matching children (e.g. oldPath = "CP", child = "CP/Leetcode/main.cpp")
    const targets = allItems.filter(x => x.path === oldPath || x.path.startsWith(oldPath + '/'));
    
    for (const target of targets) {
      const suffix = target.path.slice(oldPath.length);
      const targetNewPath = newPath + suffix;
      
      const { error: moveError } = await supabase
        .from('student_workspace_files')
        .update({ path: targetNewPath, updated_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .eq('path', target.path);
        
      if (moveError) {
        throw new Error(`Directory child rename failed: ${moveError.message}`);
      }
    }
  }
}

// Delete file or folder (recursively)
export async function deleteWorkspaceItem(supabase: SupabaseClient, studentId: string, rawPath: string): Promise<void> {
  const path = cleanAndValidatePath(rawPath);
  
  // Verify item exists
  const { data: item, error: getError } = await supabase
    .from('student_workspace_files')
    .select('kind')
    .eq('student_id', studentId)
    .eq('path', path)
    .single();
    
  if (getError || !item) {
    throw new Error(`Item not found: ${toUserFacingPath(path)}`);
  }
  
  if (item.kind === 'file') {
    const { error: deleteError } = await supabase
      .from('student_workspace_files')
      .delete()
      .eq('student_id', studentId)
      .eq('path', path);
      
    if (deleteError) {
      throw new Error(`Delete failed: ${deleteError.message}`);
    }
  } else {
    // Delete directory and all children
    const { error: deleteError } = await supabase
      .from('student_workspace_files')
      .delete()
      .eq('student_id', studentId)
      .or(`path.eq.${path},path.like.${path}/*`);
      
    if (deleteError) {
      throw new Error(`Directory delete failed: ${deleteError.message}`);
    }
  }
}
