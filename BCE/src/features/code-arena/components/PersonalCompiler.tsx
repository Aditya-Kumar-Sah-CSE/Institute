'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import {
  Play,
  Eraser,
  Trash2,
  Copy,
  Maximize2,
  Minimize2,
  Terminal,
  CheckCircle2,
  Share2,
  Folder,
  FolderOpen,
  FolderPlus,
  FileCode,
  Plus,
  Edit3,
  Save,
  RefreshCw,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import type { CodeLanguage, NormalizedExecutionResult } from '../types';
import './CodeArena.css';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="code-editor-loading">Loading personal workspace…</div>,
});

const starters: Record<CodeLanguage, string> = {
  cpp17: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, BCE Code Arena!" << endl;\n    return 0;\n}',
  c: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, BCE Code Arena!\\n");\n    return 0;\n}',
  java: 'class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, BCE Code Arena!");\n    }\n}',
  python: 'def solve():\n    print("Hello, BCE Code Arena!")\n\nsolve()\n',
  javascript: "'use strict';\n\nfunction solve(input) {\n    console.log('Hello, BCE Code Arena!');\n}\n\nsolve();\n",
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>React & HTML Sandbox</title>
  <!-- Load React, ReactDOM and Babel for JSX parsing -->
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 20px;
      display: grid;
      place-items: center;
      min-height: 80vh;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 24px;
      border-radius: 12px;
      text-align: center;
      backdrop-filter: blur(10px);
    }
    button {
      background: #06b6d4;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      margin-top: 12px;
      transition: opacity 0.2s;
    }
    button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    function App() {
      const [count, setCount] = React.useState(0);
      return (
        <div className="card">
          <h1>⚛️ Hello, React & HTML Sandbox!</h1>
          <p>This is compiled locally in your browser.</p>
          <button onClick={() => setCount(count + 1)}>
            Count: {count}
          </button>
        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`,
};

const monaco: Record<CodeLanguage, string> = {
  cpp17: 'cpp',
  c: 'c',
  java: 'java',
  python: 'python',
  javascript: 'javascript',
  html: 'html',
};

export interface FileItem {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  handle?: FileSystemHandle;
  children?: FileItem[];
  content?: string;
  isDirty?: boolean;
}

type Snippet = {
  id: string;
  title: string;
  language: CodeLanguage;
  source_code: string;
  stdin: string;
  updated_at: string;
};

type TabType = 'output' | 'error' | 'input' | 'details' | 'preview';

const EXCLUDED_FOLDERS = ['.git', 'node_modules', '.next', 'dist', 'build', 'out'];

export default function PersonalCompiler({ initialSnippets }: { initialSnippets: Snippet[] }) {
  const [explorerWidth, setExplorerWidth] = useState(20);
  const [isResizing, setIsResizing] = useState(false);
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // File explorer states
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeFile, setActiveFile] = useState<FileItem | null>(null);
  const [rootDirectoryHandle, setRootDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const [title, setTitle] = useState('Untitled snippet');
  const [language, setLanguage] = useState<CodeLanguage>('cpp17');
  const [code, setCode] = useState(starters.cpp17);
  const [stdin, setStdin] = useState('');
  const [state, setState] = useState('Saved');
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Health and screen modes
  const [engineHealth, setEngineHealth] = useState<'Ready' | 'Offline'>('Ready');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConsoleFullscreen, setIsConsoleFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('input');
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(true);
  const [expectedOutput, setExpectedOutput] = useState('');

  // Multiple testcases support
  interface Testcase {
    id: number;
    stdin: string;
    expectedOutput: string;
  }
  const [testcases, setTestcases] = useState<Testcase[]>([
    { id: 1, stdin: '', expectedOutput: '' }
  ]);
  const [activeTestcaseIdx, setActiveTestcaseIdx] = useState(0);
  const [testcaseResults, setTestcaseResults] = useState<Record<number, NormalizedExecutionResult | null>>({});

  const handleAddTestcase = () => {
    const nextId = testcases.length > 0 ? Math.max(...testcases.map(tc => tc.id)) + 1 : 1;
    setTestcases(prev => [...prev, { id: nextId, stdin: '', expectedOutput: '' }]);
    setActiveTestcaseIdx(testcases.length);
  };

  const handleDeleteTestcase = (idxToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (testcases.length <= 1) return;
    setTestcases(prev => prev.filter((_, idx) => idx !== idxToDelete));
    if (activeTestcaseIdx >= testcases.length - 1) {
      setActiveTestcaseIdx(Math.max(0, testcases.length - 2));
    }
  };

  const handleStdinChange = (val: string) => {
    setTestcases(prev => prev.map((tc, idx) => idx === activeTestcaseIdx ? { ...tc, stdin: val } : tc));
  };

  const handleExpectedChange = (val: string) => {
    setTestcases(prev => prev.map((tc, idx) => idx === activeTestcaseIdx ? { ...tc, expectedOutput: val } : tc));
  };

  // Execution outputs
  const [result, setResult] = useState<NormalizedExecutionResult | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  // 1. Introspect Wandbox compiler service health dynamically
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('https://wandbox.org/api/list.json');
        if (res.ok) {
          setEngineHealth('Ready');
        } else {
          setEngineHealth('Offline');
        }
      } catch (_e) {
        setEngineHealth('Offline');
      }
    }
    checkHealth();
  }, []);

  // 2. Load fallback files or resolve queries
  useEffect(() => {
    // If opening from share link query parameters
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    const langParam = params.get('lang');
    const titleParam = params.get('title');

    if (codeParam) {
      const decodedCode = decodeURIComponent(codeParam);
      const decodedTitle = titleParam ? decodeURIComponent(titleParam) : 'Shared code';
      const decodedLang = (langParam as CodeLanguage) || 'cpp17';

      const sharedFile: FileItem = {
        name: decodedTitle,
        path: decodedTitle,
        kind: 'file',
        content: decodedCode,
      };

      setFiles([sharedFile]);
      setLanguage(decodedLang);
      selectFile(sharedFile);
      return;
    }

    // Default initialization: Virtual Local Storage FS
    const saved = localStorage.getItem('bce:playground-virtual-files');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFiles(parsed);
        const first = findFirstFile(parsed);
        if (first) selectFile(first);
      } catch (_e) {
        loadDefaultVirtualFiles();
      }
    } else {
      loadDefaultVirtualFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Save virtual files to localstorage
  useEffect(() => {
    if (files.length > 0 && !rootDirectoryHandle) {
      // Clean handle references before saving to local storage
      const cleanTree = stripHandles(files);
      localStorage.setItem('bce:playground-virtual-files', JSON.stringify(cleanTree));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, rootDirectoryHandle]);

  // 4. Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          handleProjectSave();
        } else {
          handleSaveActiveFile();
        }
      } else if (cmdKey && e.key === 'Enter') {
        e.preventDefault();
        runCode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, code, language, stdin, files]);

  // 5. Beforeunload unsaved alert
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsaved = activeFile?.isDirty || files.some(f => hasUnsavedChanges(f));
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, files]);

  // Helper utility functions
  function stripHandles(tree: FileItem[]): FileItem[] {
    return tree.map(node => ({
      name: node.name,
      path: node.path,
      kind: node.kind,
      content: node.content,
      isDirty: node.isDirty,
      children: node.children ? stripHandles(node.children) : undefined,
    }));
  }

  function hasUnsavedChanges(node: FileItem): boolean {
    if (node.isDirty) return true;
    if (node.children) {
      return node.children.some(child => hasUnsavedChanges(child));
    }
    return false;
  }

  function loadDefaultVirtualFiles() {
    const defaultTree: FileItem[] = [
      { name: 'main.cpp', path: 'main.cpp', kind: 'file', content: starters.cpp17 },
      { name: 'Main.java', path: 'Main.java', kind: 'file', content: starters.java },
      { name: 'solve.py', path: 'solve.py', kind: 'file', content: starters.python },
      { name: 'index.html', path: 'index.html', kind: 'file', content: starters.html },
      { name: 'script.js', path: 'script.js', kind: 'file', content: starters.javascript },
    ];
    setFiles(defaultTree);
    selectFile(defaultTree[0]);
  }

  function findFirstFile(tree: FileItem[]): FileItem | null {
    for (const item of tree) {
      if (item.kind === 'file') return item;
      if (item.children) {
        const found = findFirstFile(item.children);
        if (found) return found;
      }
    }
    return null;
  }

  async function buildFileTree(dirHandle: FileSystemDirectoryHandle, relativePath = ''): Promise<FileItem[]> {
    const items: FileItem[] = [];
    for await (const entry of (dirHandle as any).values()) {
      const entryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        items.push({
          name: entry.name,
          path: entryPath,
          kind: 'file',
          handle: entry,
        });
      } else if (entry.kind === 'directory') {
        if (EXCLUDED_FOLDERS.includes(entry.name)) continue;
        const children = await buildFileTree(entry, entryPath);
        items.push({
          name: entry.name,
          path: entryPath,
          kind: 'directory',
          handle: entry,
          children,
        });
      }
    }
    return items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  // File explorer interactions
  const openFolder = async () => {
    try {
      if (activeFile?.isDirty) {
        if (confirm(`You have unsaved changes in "${activeFile.name}". Save now?`)) {
          await handleSaveActiveFile();
        }
      }
      const dirHandle = await (window as any).showDirectoryPicker();
      setRootDirectoryHandle(dirHandle);
      const tree = await buildFileTree(dirHandle);
      setFiles(tree);
      const first = findFirstFile(tree);
      if (first) {
        await selectFile(first);
      } else {
        setActiveFile(null);
        setCode('');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        alert('Could not mount directory: ' + e.message);
      }
    }
  };

  const selectFile = async (item: FileItem) => {
    try {
      let content = item.content || '';
      if (item.handle && item.handle.kind === 'file') {
        const file = await (item.handle as FileSystemFileHandle).getFile();
        content = await file.text();
      }

      const parts = item.name.split('.');
      const ext = parts[parts.length - 1]?.toLowerCase() || '';
      let detectedLang: CodeLanguage = 'cpp17';
      if (['cpp', 'cc', 'cxx', 'h', 'hpp'].includes(ext)) detectedLang = 'cpp17';
      else if (ext === 'c') detectedLang = 'c';
      else if (ext === 'java') detectedLang = 'java';
      else if (['py', 'py3'].includes(ext)) detectedLang = 'python';
      else if (['js', 'mjs', 'cjs'].includes(ext)) detectedLang = 'javascript';
      else if (['html', 'htm'].includes(ext)) detectedLang = 'html';

      setActiveFile({ ...item, content, isDirty: !!item.isDirty });
      setCode(content);
      setLanguage(detectedLang);
      setTitle(item.name);
      setState(item.isDirty ? 'Unsaved changes' : 'Saved');
    } catch (e: any) {
      alert('Error reading file contents: ' + e.message);
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (activeFile) {
      setActiveFile(prev => prev ? { ...prev, content: newCode, isDirty: true } : null);
      setFiles(prev => updateFileInTree(prev, activeFile.path, { content: newCode, isDirty: true }));
      setState('Unsaved changes');
    }
  };

  function updateFileInTree(nodes: FileItem[], path: string, updates: Partial<FileItem>): FileItem[] {
    return nodes.map(node => {
      if (node.path === path) {
        return { ...node, ...updates };
      }
      if (node.children) {
        return { ...node, children: updateFileInTree(node.children, path, updates) };
      }
      return node;
    });
  }

  // Save actions
  const handleSaveActiveFile = async () => {
    if (!activeFile) return;
    setSaving(true);
    setState('Saving…');

    try {
      if (activeFile.handle && activeFile.handle.kind === 'file') {
        const writable = await (activeFile.handle as any).createWritable();
        await writable.write(code);
        await writable.close();
      }

      setFiles(prev => updateFileInTree(prev, activeFile.path, { content: code, isDirty: false }));
      setActiveFile(prev => prev ? { ...prev, content: code, isDirty: false } : null);
      setState('Saved');
    } catch (err: any) {
      alert('Failed to save file: ' + err.message);
      setState('Unsaved changes');
    } finally {
      setSaving(false);
    }
  };

  const handleProjectSave = async () => {
    setSaving(true);
    setState('Saving Project…');
    try {
      const res = await fetch('/api/coding/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || activeFile?.name || 'Untitled project',
          language,
          sourceCode: code,
          stdin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setState('Project Saved on Server');
    } catch (e: any) {
      alert('Could not persist project on server: ' + e.message);
      setState('Unsaved changes');
    } finally {
      setSaving(false);
    }
  };

  // Node creations / operations
  const triggerCreateFile = async (parentPath: string) => {
    const filename = prompt('Enter new filename (e.g. hello.cpp):');
    if (!filename) return;

    try {
      if (rootDirectoryHandle) {
        const parentHandle = await findDirectoryHandle(rootDirectoryHandle, parentPath);
        if (parentHandle) {
          const fileHandle = await parentHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(starters[getFileLanguage(filename)] || '');
          await writable.close();
          const tree = await buildFileTree(rootDirectoryHandle);
          setFiles(tree);
        }
      } else {
        const fullPath = parentPath ? `${parentPath}/${filename}` : filename;
        const newNode: FileItem = {
          name: filename,
          path: fullPath,
          kind: 'file',
          content: starters[getFileLanguage(filename)] || '',
        };
        setFiles(prev => addNodeToTree(prev, parentPath, newNode));
      }
    } catch (e: any) {
      alert('Error creating file: ' + e.message);
    }
  };

  const triggerCreateFolder = async (parentPath: string) => {
    const foldername = prompt('Enter new folder name:');
    if (!foldername) return;

    try {
      if (rootDirectoryHandle) {
        const parentHandle = await findDirectoryHandle(rootDirectoryHandle, parentPath);
        if (parentHandle) {
          await parentHandle.getDirectoryHandle(foldername, { create: true });
          const tree = await buildFileTree(rootDirectoryHandle);
          setFiles(tree);
        }
      } else {
        const fullPath = parentPath ? `${parentPath}/${foldername}` : foldername;
        const newNode: FileItem = {
          name: foldername,
          path: fullPath,
          kind: 'directory',
          children: [],
        };
        setFiles(prev => addNodeToTree(prev, parentPath, newNode));
      }
    } catch (e: any) {
      alert('Error creating folder: ' + e.message);
    }
  };

  const triggerRename = async (item: FileItem) => {
    const newName = prompt(`Enter new name for "${item.name}":`, item.name);
    if (!newName || newName === item.name) return;

    try {
      if (rootDirectoryHandle) {
        if (item.handle) {
          if (typeof (item.handle as any).move === 'function') {
            await (item.handle as any).move(newName);
          } else {
            // Manual fallback if handle.move is not supported
            if (item.kind === 'file') {
              const file = await (item.handle as FileSystemFileHandle).getFile();
              const text = await file.text();
              const parentPath = item.path.split('/').slice(0, -1).join('/');
              const parentHandle = await findDirectoryHandle(rootDirectoryHandle, parentPath);
              if (parentHandle) {
                const newHandle = await parentHandle.getFileHandle(newName, { create: true });
                const wr = await newHandle.createWritable();
                await wr.write(text);
                await wr.close();
                await parentHandle.removeEntry(item.name);
              }
            } else {
              throw new Error('Folder renaming not supported natively on this browser.');
            }
          }
          const tree = await buildFileTree(rootDirectoryHandle);
          setFiles(tree);
        }
      } else {
        setFiles(prev => renameNodeInTree(prev, item.path, newName));
        if (activeFile?.path === item.path) {
          const parts = item.path.split('/');
          parts[parts.length - 1] = newName;
          setActiveFile(prev => prev ? { ...prev, name: newName, path: parts.join('/') } : null);
        }
      }
    } catch (e: any) {
      alert('Rename failed: ' + e.message);
    }
  };

  const triggerDelete = async (item: FileItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      if (rootDirectoryHandle) {
        const parentPath = item.path.split('/').slice(0, -1).join('/');
        const parentHandle = await findDirectoryHandle(rootDirectoryHandle, parentPath);
        if (parentHandle) {
          await parentHandle.removeEntry(item.name, { recursive: true });
          const tree = await buildFileTree(rootDirectoryHandle);
          setFiles(tree);
        }
      } else {
        setFiles(prev => deleteNodeFromTree(prev, item.path));
      }

      if (activeFile?.path === item.path) {
        setActiveFile(null);
        setCode('');
      }
    } catch (e: any) {
      alert('Deletion failed: ' + e.message);
    }
  };

  const refreshExplorer = async () => {
    if (rootDirectoryHandle) {
      const tree = await buildFileTree(rootDirectoryHandle);
      setFiles(tree);
    }
  };

  // Helper traversal methods for explorer
  async function findDirectoryHandle(root: FileSystemDirectoryHandle, targetPath: string): Promise<FileSystemDirectoryHandle | null> {
    if (!targetPath) return root;
    const parts = targetPath.split('/');
    let current = root;
    for (const part of parts) {
      current = await current.getDirectoryHandle(part);
    }
    return current;
  }

  function addNodeToTree(nodes: FileItem[], parentPath: string, newNode: FileItem): FileItem[] {
    if (!parentPath) {
      return [...nodes, newNode].sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
    return nodes.map(node => {
      if (node.path === parentPath) {
        return {
          ...node,
          children: [...(node.children || []), newNode].sort((a, b) => {
            if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name);
          }),
        };
      }
      if (node.children) {
        return { ...node, children: addNodeToTree(node.children, parentPath, newNode) };
      }
      return node;
    });
  }

  function deleteNodeFromTree(nodes: FileItem[], path: string): FileItem[] {
    return nodes
      .filter(node => node.path !== path)
      .map(node => {
        if (node.children) {
          return { ...node, children: deleteNodeFromTree(node.children, path) };
        }
        return node;
      });
  }

  function renameNodeInTree(nodes: FileItem[], oldPath: string, newName: string): FileItem[] {
    return nodes.map(node => {
      if (node.path === oldPath) {
        const parts = oldPath.split('/');
        parts[parts.length - 1] = newName;
        const newPath = parts.join('/');
        return { ...node, name: newName, path: newPath };
      }
      if (node.children) {
        return { ...node, children: renameNodeInTree(node.children, oldPath, newName) };
      }
      return node;
    });
  }

  function getFileLanguage(filename: string): CodeLanguage {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'cpp' || ext === 'cc') return 'cpp17';
    if (ext === 'c') return 'c';
    if (ext === 'java') return 'java';
    if (ext === 'py') return 'python';
    if (ext === 'js') return 'javascript';
    if (ext === 'html') return 'html';
    return 'cpp17';
  }

  // Compiler logic
  const runCode = async () => {
    setIsConsoleCollapsed(false);
    if (language === 'html') {
      setIframeKey(k => k + 1);
      setActiveTab('preview');
      return;
    }

    setRunning(true);
    setResult(null);
    setTestcaseResults({});

    try {
      const executePromises = testcases.map(async (tc) => {
        try {
          const res = await fetch('/api/coding/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language, stdin: tc.stdin }),
          });
          const data: NormalizedExecutionResult = await res.json();
          return { id: tc.id, result: data };
        } catch {
          return {
            id: tc.id,
            result: {
              status: 'SYSTEM_ERROR',
              stdout: '',
              stderr: '',
              compileStdout: '',
              compileStderr: '',
              exitCode: null,
              signal: null,
              executionTimeMs: null,
              memoryUsedMb: null,
              message: 'Unable to reach execution server. Please try again.',
            } as NormalizedExecutionResult
          };
        }
      });

      const resolved = await Promise.all(executePromises);
      
      const newResults: Record<number, NormalizedExecutionResult> = {};
      resolved.forEach((item) => {
        newResults[item.id] = item.result;
      });
      
      setTestcaseResults(newResults);

      const firstTc = testcases[0];
      const mainRes = newResults[firstTc.id];
      setResult(mainRes);

      const hasCompileErr = Object.values(newResults).some(
        r => r?.status === 'COMPILATION_ERROR'
      );
      if (hasCompileErr) {
        setActiveTab('error');
      } else {
        setActiveTab('output');
      }
    } catch (e) {
      console.error(e);
      setActiveTab('error');
    } finally {
      setRunning(false);
    }
  };

  const clearConsole = () => {
    setResult(null);
    setActiveTab('output');
  };



  // Drag resizing between explorer and editor
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !workspaceContainerRef.current) return;
      const rect = workspaceContainerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      if (pct >= 10 && pct <= 50) {
        setExplorerWidth(pct);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const errorCount = result && (result.compileStderr || result.stderr || result.status === 'COMPILATION_ERROR' || result.status === 'RUNTIME_ERROR') ? 1 : 0;

  return (
    <div
      ref={workspaceContainerRef}
      className="compiler-layout"
      style={isFullscreen ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg-primary)',
        display: 'flex',
        width: '100vw',
        height: '100vh',
        padding: '16px',
        minHeight: 0,
      } : {
        display: 'flex',
        width: '100%',
        height: '100%',
        flex: 1,
        minHeight: 'calc(100vh - 120px)',
        position: 'relative',
        background: 'var(--bg-primary)',
        borderRadius: '8px',
        border: '1px solid var(--glass-border)',
        overflow: 'hidden'
      }}
    >
      {/* 20% Panel: Local Explorer / Fallback tree */}
      <aside
        className="snippet-panel"
        style={{
          width: `${explorerWidth}%`,
          flexShrink: 0,
          flexGrow: 0,
          padding: 'var(--space-md)',
          borderRight: '1px solid var(--glass-border)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 'var(--text-sm)' }}>Explorer</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => triggerCreateFile('')}
              title="New File"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => triggerCreateFolder('')}
              title="New Folder"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
            >
              <FolderPlus size={14} />
            </button>
            {rootDirectoryHandle && (
              <button
                onClick={refreshExplorer}
                title="Refresh Explorer"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
              >
                <RefreshCw size={12} />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={openFolder}
          style={{
            width: '100%',
            height: '2.2rem',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            borderRadius: '4px',
            border: '1px solid var(--glass-border)',
            background: 'rgba(255, 255, 255, 0.03)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <FolderOpen size={13} /> {rootDirectoryHandle ? 'Change Folder' : 'Open Folder'}
        </button>

        {rootDirectoryHandle && (
          <div style={{ fontSize: '11px', color: 'var(--neon-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📁 {rootDirectoryHandle.name}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {files.map((file, idx) => (
            <FileExplorerItem
              key={idx}
              item={file}
              depth={0}
              activePath={activeFile?.path}
              expandedPaths={expandedPaths}
              onSelect={selectFile}
              onToggle={(p) => setExpandedPaths(prev => {
                const next = new Set(prev);
                if (next.has(p)) next.delete(p);
                else next.add(p);
                return next;
              })}
              onCreateFile={triggerCreateFile}
              onCreateFolder={triggerCreateFolder}
              onRename={triggerRename}
              onDelete={triggerDelete}
            />
          ))}
        </div>
      </aside>

      {/* Resize bar handler */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: '8px',
          cursor: 'col-resize',
          background: isResizing ? 'var(--neon-cyan)' : 'transparent',
          borderLeft: '1px solid var(--glass-border)',
          borderRight: '1px solid var(--glass-border)',
          flexShrink: 0,
          zIndex: 10,
          userSelect: 'none',
        }}
      />

      {/* 80% Panel: Editor + Console */}
      <section
        className="compiler-main"
        style={{
          width: `${100 - explorerWidth}%`,
          flexShrink: 0,
          flexGrow: 0,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header className="code-editor-toolbar">
          {/* Left part: filename */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>
              {activeFile?.name || 'No file selected'}
            </span>
            {activeFile?.isDirty && (
              <span style={{ color: 'var(--neon-gold)', fontSize: '10px' }}>● Unsaved</span>
            )}
          </div>

          {/* Center part: Toggle tabs (Testcase, Output, Error) */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flex: 1 }}>
            <button
              type="button"
              className={`oj-tab ${activeTab === 'input' && !isConsoleCollapsed ? 'active' : ''}`}
              onClick={() => {
                if (activeTab === 'input' && !isConsoleCollapsed) {
                  setIsConsoleCollapsed(true);
                } else {
                  setActiveTab('input');
                  setIsConsoleCollapsed(false);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderRadius: '4px',
                border: '1px solid var(--glass-border)',
                background: activeTab === 'input' && !isConsoleCollapsed ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                color: activeTab === 'input' && !isConsoleCollapsed ? 'var(--neon-cyan)' : 'var(--text-secondary)'
              }}
            >
              📋 Testcase
            </button>
            <button
              type="button"
              className={`oj-tab ${activeTab === 'output' && !isConsoleCollapsed ? 'active' : ''}`}
              onClick={() => {
                if (activeTab === 'output' && !isConsoleCollapsed) {
                  setIsConsoleCollapsed(true);
                } else {
                  setActiveTab('output');
                  setIsConsoleCollapsed(false);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderRadius: '4px',
                border: '1px solid var(--glass-border)',
                background: activeTab === 'output' && !isConsoleCollapsed ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                color: activeTab === 'output' && !isConsoleCollapsed ? 'var(--neon-cyan)' : 'var(--text-secondary)'
              }}
            >
              📊 Output
            </button>
            <button
              type="button"
              className={`oj-tab ${activeTab === 'error' && !isConsoleCollapsed ? 'active' : ''}`}
              onClick={() => {
                if (activeTab === 'error' && !isConsoleCollapsed) {
                  setIsConsoleCollapsed(true);
                } else {
                  setActiveTab('error');
                  setIsConsoleCollapsed(false);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderRadius: '4px',
                border: '1px solid var(--glass-border)',
                background: activeTab === 'error' && !isConsoleCollapsed ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                color: activeTab === 'error' && !isConsoleCollapsed ? '#ef4444' : 'var(--text-secondary)'
              }}
            >
              ⚠️ Error {errorCount > 0 && <span className="oj-err-badge" style={{ padding: '1px 5px', fontSize: '9px', marginLeft: '4px' }}>{errorCount}</span>}
            </button>
            {language === 'html' && (
              <button
                type="button"
                className={`oj-tab ${activeTab === 'preview' && !isConsoleCollapsed ? 'active' : ''}`}
                onClick={() => {
                  if (activeTab === 'preview' && !isConsoleCollapsed) {
                    setIsConsoleCollapsed(true);
                  } else {
                    setActiveTab('preview');
                    setIsConsoleCollapsed(false);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  border: '1px solid var(--glass-border)',
                  background: activeTab === 'preview' && !isConsoleCollapsed ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                  color: activeTab === 'preview' && !isConsoleCollapsed ? 'var(--neon-cyan)' : 'var(--text-secondary)'
                }}
              >
                🌐 UI Preview
              </button>
            )}
          </div>

          {/* Right part: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
            <select
              value={language}
              aria-label="Language Mode"
              style={{ padding: '4px 8px', fontSize: '12px' }}
              onChange={(e) => {
                const l = e.target.value as CodeLanguage;
                setLanguage(l);
                setCode(starters[l]);
                if (activeFile) {
                  setFiles(prev => updateFileInTree(prev, activeFile.path, { content: starters[l], isDirty: true }));
                  setActiveFile(prev => prev ? { ...prev, content: starters[l], isDirty: true } : null);
                }
                setState('Unsaved changes');
              }}
            >
              {Object.keys(starters).map((l) => (
                <option key={l} value={l}>
                  {l === 'cpp17' ? 'C++17' : l.toUpperCase()}
                </option>
              ))}
            </select>

            <span className="text-secondary" style={{ fontSize: '11px' }}>
              {state}
            </span>

            {/* Run Code icon button */}
            <button
              onClick={runCode}
              disabled={running}
              title="Run Code (Ctrl+Enter)"
              className="oj-icon-btn"
              style={{ color: 'var(--neon-cyan)', border: '1px solid rgba(6, 182, 212, 0.25)', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Play size={14} fill="currentColor" />
            </button>

            {/* Save Active File icon button */}
            <button
              onClick={handleSaveActiveFile}
              title="Save File (Ctrl+S)"
              className="oj-icon-btn"
              style={{ color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '6px' }}
            >
              <Save size={14} />
            </button>

            {/* Share snapshot icon button */}
            <button
              onClick={() => setShareOpen(true)}
              title="Share Workspace link"
              className="oj-icon-btn"
              style={{ color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.25)', padding: '6px' }}
            >
              <Share2 size={14} />
            </button>

            {/* Delete active file button */}
            {activeFile && (
              <button
                onClick={() => triggerDelete(activeFile)}
                title="Delete Active File"
                className="oj-icon-btn"
                style={{ color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '6px' }}
              >
                <Trash2 size={14} />
              </button>
            )}

            {/* Fullscreen icon button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title="Toggle Fullscreen"
              className="oj-icon-btn"
              style={{ padding: '6px' }}
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </header>

        <div style={{ flex: 1, minHeight: '260px', position: 'relative' }}>
          <Editor
            height="100%"
            theme="vs-dark"
            language={monaco[language]}
            value={code}
            onChange={(v) => handleCodeChange(v || '')}
            options={{ automaticLayout: true, minimap: { enabled: false }, fontSize: 14 }}
          />
        </div>
         {/* Bottom Console Panel */}
        {isConsoleCollapsed ? null : (
          /* Expanded bottom console */
          <section
            className={`oj-console-wrapper ${isConsoleFullscreen ? 'console-fullscreen' : ''}`}
            style={{
              height: isConsoleFullscreen ? '100%' : '350px',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              position: isConsoleFullscreen ? 'fixed' : 'relative',
              inset: isConsoleFullscreen ? 0 : 'auto',
              zIndex: isConsoleFullscreen ? 9999 : 'auto',
              marginTop: '8px'
            }}
          >
            {/* Console Header */}
            <div className="oj-top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div className="oj-title-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '13px' }}>Console & Output</h3>
                <span className={`oj-pill ${engineHealth === 'Ready' ? 'oj-pill-ready' : 'oj-err-badge'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                  <span className="oj-dot" /> {engineHealth === 'Ready' ? 'Connected' : 'Offline'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsConsoleCollapsed(true)}
                  title="Collapse Console"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {/* Console Output Body */}
            <div className="oj-console-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {activeTab === 'preview' && language === 'html' && (
                <div style={{ width: '100%', height: '100%', minHeight: '220px', background: '#ffffff', borderRadius: '4px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                  <iframe
                    key={iframeKey}
                    srcDoc={code}
                    sandbox="allow-scripts"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="UI Preview"
                  />
                </div>
              )}

              {activeTab === 'input' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  {/* Case tabs row */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px', width: '100%' }}>
                    {testcases.map((tc, idx) => (
                      <div
                        key={tc.id}
                        onClick={() => setActiveTestcaseIdx(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--glass-border)',
                          background: idx === activeTestcaseIdx ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          color: idx === activeTestcaseIdx ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span>Case {idx + 1}</span>
                        {testcases.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTestcase(idx, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '10px',
                              marginLeft: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddTestcase}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px dashed var(--glass-border)',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                    >
                      + Add Case
                    </button>
                  </div>

                  <div 
                    className="oj-input-card" 
                    style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      flexDirection: 'row', 
                      flexWrap: 'wrap',
                      width: '100%' 
                    }}
                  >
                    <div style={{ flex: '1 1 calc(50% - 8px)', minWidth: '280px', height: '20rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Custom Stdin Input</span>
                        <button
                          type="button"
                          onClick={() => handleStdinChange('')}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px' }}
                        >
                          Clear
                        </button>
                      </div>
                      <textarea
                        value={testcases[activeTestcaseIdx]?.stdin || ''}
                        onChange={(e) => handleStdinChange(e.target.value)}
                        placeholder="Enter standard input (stdin) for code execution..."
                        style={{
                          flex: 1,
                          background: 'rgba(0,0,0,0.15)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '4px',
                          padding: '6px 8px',
                          color: 'white',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          resize: 'none',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ flex: '1 1 calc(50% - 8px)', minWidth: '280px', height: '20rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Expected Output (Optional)</span>
                        <button
                          type="button"
                          onClick={() => handleExpectedChange('')}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px' }}
                        >
                          Clear
                        </button>
                      </div>
                      <textarea
                        value={testcases[activeTestcaseIdx]?.expectedOutput || ''}
                        onChange={(e) => handleExpectedChange(e.target.value)}
                        placeholder="Enter expected output to verify testcase correctness..."
                        style={{
                          flex: 1,
                          background: 'rgba(0,0,0,0.15)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '4px',
                          padding: '6px 8px',
                          color: 'white',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          resize: 'none',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'output' && (
                !result ? (
                  <div className="oj-empty-state">
                    <Play size={24} style={{ color: 'var(--text-muted)' }} />
                    <p style={{ margin: '8px 0 0 0' }}>Click "Run Code ▶" to execute code and see stdout outputs here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', height: '100%' }}>
                    {/* Case tabs row for output */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                      {testcases.map((tc, idx) => {
                        const tcRes = testcaseResults[tc.id];
                        const hasOutcome = tcRes && tc.expectedOutput.trim() && tcRes.stdout;
                        const matched = hasOutcome && tcRes.stdout.trim() === tc.expectedOutput.trim();
                        
                        return (
                          <div
                            key={tc.id}
                            onClick={() => setActiveTestcaseIdx(idx)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--glass-border)',
                              background: idx === activeTestcaseIdx ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                              color: idx === activeTestcaseIdx 
                                ? 'var(--neon-cyan)' 
                                : hasOutcome 
                                  ? (matched ? '#10b981' : '#ef4444')
                                  : 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              transition: 'all 0.2s'
                            }}
                          >
                            <span>Case {idx + 1}</span>
                            {hasOutcome && (
                              <span style={{ fontSize: '9px', marginLeft: '4px', color: matched ? '#10b981' : '#ef4444' }}>
                                {matched ? '✓' : '✗'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Display result for active testcase */}
                    {(() => {
                      const activeTc = testcases[activeTestcaseIdx];
                      const activeTcRes = testcaseResults[activeTc.id];
                      
                      if (!activeTcRes) {
                        return (
                          <div className="oj-empty-state" style={{ minHeight: '120px' }}>
                            <p>No result for this testcase. Press Run Code to execute.</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {activeTc.expectedOutput.trim() && activeTcRes.stdout && (
                            (() => {
                              const matched = activeTcRes.stdout.trim() === activeTc.expectedOutput.trim();
                              return matched ? (
                                <div style={{
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '6px',
                                  padding: '8px 12px',
                                  marginBottom: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: '#10b981'
                                }}>
                                  <CheckCircle2 size={16} />
                                  <div>
                                    <strong style={{ fontSize: '12px' }}>✓ Testcase {activeTestcaseIdx + 1} Passed</strong>
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>Your stdout matches expected output.</div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  borderRadius: '6px',
                                  padding: '8px 12px',
                                  marginBottom: '12px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                  color: '#ef4444'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertTriangle size={16} />
                                    <strong style={{ fontSize: '12px' }}>✗ Testcase {activeTestcaseIdx + 1} Failed (Output Mismatch)</strong>
                                  </div>
                                  <div style={{ display: 'flex', gap: '12px', marginTop: '2px' }}>
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Expected</span>
                                      <pre style={{ margin: '2px 0 0 0', padding: '4px 6px', background: 'rgba(0,0,0,0.25)', borderRadius: '4px', fontSize: '11px', color: '#10b981', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                        {activeTc.expectedOutput.trim()}
                                      </pre>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Actual Output</span>
                                      <pre style={{ margin: '2px 0 0 0', padding: '4px 6px', background: 'rgba(0,0,0,0.25)', borderRadius: '4px', fontSize: '11px', color: '#ef4444', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                        {activeTcRes.stdout.trim() || '(empty)'}
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()
                          )}
                          <pre className="oj-code-block" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            {activeTcRes.stdout || 'Program executed successfully with no stdout output.'}
                          </pre>
                        </div>
                      );
                    })()}
                  </div>
                )
              )}

              {activeTab === 'error' && (
                !result ? (
                  <div className="oj-empty-state">
                    <Play size={24} style={{ color: 'var(--text-muted)' }} />
                    <p style={{ margin: '8px 0 0 0' }}>Compiler stderr errors and diagnostics will be shown here.</p>
                  </div>
                ) : (
                  <div>
                    <pre className="oj-code-block oj-code-error">
                      {result.compileStderr || result.stderr || result.message || 'No errors.'}
                    </pre>
                  </div>
                )
              )}

              {activeTab === 'details' && (
                <div className="oj-details-grid">
                  <div className="oj-detail-item">
                    <span className="oj-detail-label">Status</span>
                    <span className="oj-detail-val">{result?.status || 'Ready'}</span>
                  </div>
                  <div className="oj-detail-item">
                    <span className="oj-detail-label">Language Mode</span>
                    <span className="oj-detail-val">{language.toUpperCase()}</span>
                  </div>
                  <div className="oj-detail-item">
                    <span className="oj-detail-label">Exit Code</span>
                    <span className="oj-detail-val">{result?.exitCode !== null ? result?.exitCode : '—'}</span>
                  </div>
                  <div className="oj-detail-item">
                    <span className="oj-detail-label">Signal</span>
                    <span className="oj-detail-val">{result?.signal || '—'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom actions bar */}
            <div className="oj-bottom-meta-bar" style={{ marginTop: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '6px' }}>
              <div className="oj-meta-left" style={{ fontSize: '11px' }}>
                <span>Time Limit: <strong>1.0s</strong></span>
                <span>Memory Limit: <strong>256MB</strong></span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="oj-btn-clear"
                  onClick={clearConsole}
                  title="Clear console output"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px' }}
                >
                  <Eraser size={12} /> Clear
                </button>
                <button
                  type="button"
                  className="oj-btn-clear"
                  onClick={() => {
                    if (result?.stdout) {
                      navigator.clipboard.writeText(result.stdout);
                    }
                  }}
                  title="Copy output"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px' }}
                >
                  <Copy size={12} /> Copy
                </button>
                <button
                  type="button"
                  className="oj-btn-clear"
                  onClick={() => setIsConsoleFullscreen(!isConsoleFullscreen)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px' }}
                >
                  {isConsoleFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />} Expand
                </button>
                {activeFile && (
                  <button
                    type="button"
                    className="oj-btn-clear"
                    onClick={() => triggerDelete(activeFile)}
                    title="Delete active file"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
      </section>

      <ShareSnippetModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        code={code}
        language={language}
        title={title}
      />
    </div>
  );
}

function FileExplorerItem({
  item,
  depth,
  activePath,
  expandedPaths,
  onSelect,
  onToggle,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
}: {
  item: FileItem;
  depth: number;
  activePath?: string;
  expandedPaths: Set<string>;
  onSelect: (item: FileItem) => void;
  onToggle: (path: string) => void;
  onCreateFile: (parentPath: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onRename: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
}) {
  const isExpanded = expandedPaths.has(item.path);
  const isActive = activePath === item.path;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          paddingLeft: `${depth * 12 + 8}px`,
          background: isActive ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--neon-cyan)' : '2px solid transparent',
          cursor: 'pointer',
          borderRadius: '4px',
          transition: 'all 0.15s',
        }}
        onClick={() => {
          if (item.kind === 'directory') {
            onToggle(item.path);
          } else {
            onSelect(item);
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          {item.kind === 'directory' ? (
            <span style={{ color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center' }}>
              {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              {item.name.endsWith('.html') ? <FileCode size={14} style={{ color: '#fb923c' }} /> :
               item.name.endsWith('.java') ? <FileCode size={14} style={{ color: '#ee7700' }} /> :
               item.name.endsWith('.py') ? <FileCode size={14} style={{ color: '#3b82f6' }} /> :
               item.name.endsWith('.js') ? <FileCode size={14} style={{ color: '#facc15' }} /> :
               <FileCode size={14} style={{ color: 'var(--neon-cyan)' }} />}
            </span>
          )}
          <span
            style={{
              fontSize: '12.5px',
              color: isActive ? 'var(--text-main)' : 'var(--text-secondary)',
              fontWeight: isActive ? 700 : 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.name}
            {item.isDirty && (
              <span style={{ marginLeft: '4px', color: 'var(--neon-gold)', fontSize: '10px' }}>●</span>
            )}
          </span>
        </div>

        {/* Action icons shown on hover */}
        {hovered && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            {item.kind === 'directory' && (
              <>
                <button
                  onClick={() => onCreateFile(item.path)}
                  title="Create File"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '2px' }}
                >
                  <Plus size={12} />
                </button>
                <button
                  onClick={() => onCreateFolder(item.path)}
                  title="Create Folder"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '2px' }}
                >
                  <FolderPlus size={12} />
                </button>
              </>
            )}
            <button
              onClick={() => onRename(item)}
              title="Rename"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '2px' }}
            >
              <Edit3 size={11} />
            </button>
            <button
              onClick={() => onDelete(item)}
              title="Delete"
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: '2px' }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {item.kind === 'directory' && isExpanded && item.children && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {item.children.map((child, idx) => (
            <FileExplorerItem
              key={idx}
              item={child}
              depth={depth + 1}
              activePath={activePath}
              expandedPaths={expandedPaths}
              onSelect={onSelect}
              onToggle={onToggle}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ShareSnippetModal({
  isOpen,
  onClose,
  code,
  language,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  language: string;
  title: string;
}) {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;

    async function fetchEnrolledCourses() {
      setLoadingCourses(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id, courses(*)')
          .eq('user_id', user.id);

        const enrolled = enrollments
          ? enrollments.map((e: any) => e.courses).filter(Boolean)
          : [];
        setCourses(enrolled);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCourses(false);
      }
    }
    fetchEnrolledCourses();
  }, [isOpen, supabase]);

  useEffect(() => {
    if (!selectedCourse) {
      setLessons([]);
      setSelectedLesson('');
      return;
    }

    async function fetchLessons() {
      setLoadingLessons(true);
      try {
        const { data } = await supabase
          .from('lessons')
          .select('id, title, sort_order')
          .eq('course_id', selectedCourse)
          .order('sort_order', { ascending: true });
        if (data) {
          setLessons(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingLessons(false);
      }
    }
    fetchLessons();
  }, [selectedCourse, supabase]);

  const handleCopyLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?code=${encodeURIComponent(code)}&lang=${encodeURIComponent(language)}&title=${encodeURIComponent(title)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareToDoubt = () => {
    if (!selectedCourse || !selectedLesson) return alert('Select course and lesson first');
    if (typeof window !== 'undefined') {
      localStorage.setItem('bce:shared-code', code);
      localStorage.setItem('bce:shared-language', language);
    }
    const targetUrl = new URL(`/courses/${selectedCourse}/${selectedLesson}`, window.location.origin);
    targetUrl.searchParams.set('askDoubt', 'true');
    window.open(targetUrl.toString(), '_blank');
  };

  const handleShareToAssignment = () => {
    if (!selectedCourse || !selectedLesson) return alert('Select course and lesson first');
    if (typeof window !== 'undefined') {
      localStorage.setItem('bce:shared-code', code);
      localStorage.setItem('bce:shared-language', language);
    }
    const targetUrl = new URL(`/courses/${selectedCourse}/${selectedLesson}`, window.location.origin);
    targetUrl.searchParams.set('fromCompiler', 'true');
    window.open(targetUrl.toString(), '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Snippet Workspace">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
          Generate a shareable playground link or attach your code directly to your course materials:
        </p>



        {/* Share inside courses */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', background: 'var(--bg-secondary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
          <div style={{ fontWeight: 'bold', fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Share to Enrolled Course / Lesson</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Course</label>
            <select
              style={{ padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px', outline: 'none' }}
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              disabled={loadingCourses}
            >
              <option value="">{loadingCourses ? 'Loading courses...' : '-- Choose Course --'}</option>
              {courses.map((course: any) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>

          {selectedCourse && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Lesson</label>
              <select
                style={{ padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px', outline: 'none' }}
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                disabled={loadingLessons}
              >
                <option value="">{loadingLessons ? 'Loading lessons...' : '-- Choose Lesson --'}</option>
                {lessons.map((lesson: any) => (
                  <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
            <Button
              size="sm"
              variant="primary"
              onClick={handleShareToDoubt}
              disabled={!selectedCourse || !selectedLesson}
              style={{ cursor: (!selectedCourse || !selectedLesson) ? 'not-allowed' : 'pointer' }}
            >
              Ask Doubt with Code
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleShareToAssignment}
              disabled={!selectedCourse || !selectedLesson}
              style={{ cursor: (!selectedCourse || !selectedLesson) ? 'not-allowed' : 'pointer' }}
            >
              Submit to Assignment
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
