import type { CodeLanguage } from '../types';
import type { CompilerFile, CompilerTestcase, CompilerWorkspace } from './compilerTypes';

const DB_NAME = 'BCECodeArena';
const DB_VERSION = 1;
const STORE_NAME = 'compilerWorkspaces';
const WORKSPACE_KEY = 'bce-default-workspace';

const DEFAULT_STARTERS: Record<CodeLanguage, string> = {
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
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; display: grid; place-items: center; min-height: 80vh; }
    .card { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 24px; border-radius: 12px; text-align: center; }
    button { background: #06b6d4; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 12px; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    function App() {
      const [count, setCount] = React.useState(0);
      return (
        <div className="card">
          <h1>Hello, React & HTML Sandbox!</h1>
          <p>This is compiled locally in your browser.</p>
          <button onClick={() => setCount(count + 1)}>Count: {count}</button>
        </div>
      );
    }
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`,
};

export function getDefaultWorkspace(): CompilerWorkspace {
  const now = Date.now();
  const defaultFiles: CompilerFile[] = [
    { id: 'main.cpp', name: 'main.cpp', path: 'main.cpp', kind: 'file', language: 'cpp17', content: DEFAULT_STARTERS.cpp17, createdAt: now, updatedAt: now },
    { id: 'Main.java', name: 'Main.java', path: 'Main.java', kind: 'file', language: 'java', content: DEFAULT_STARTERS.java, createdAt: now, updatedAt: now },
    { id: 'solve.py', name: 'solve.py', path: 'solve.py', kind: 'file', language: 'python', content: DEFAULT_STARTERS.python, createdAt: now, updatedAt: now },
    { id: 'index.html', name: 'index.html', path: 'index.html', kind: 'file', language: 'html', content: DEFAULT_STARTERS.html, createdAt: now, updatedAt: now },
    { id: 'script.js', name: 'script.js', path: 'script.js', kind: 'file', language: 'javascript', content: DEFAULT_STARTERS.javascript, createdAt: now, updatedAt: now },
  ];

  return {
    id: WORKSPACE_KEY,
    name: 'BCE Code Arena Workspace',
    activeFileId: 'main.cpp',
    files: defaultFiles,
    language: 'cpp17',
    testcases: [{ id: 1, stdin: '', expectedOutput: '' }],
    activeTestcaseIdx: 0,
    compilerSettings: { fontSize: 14, tabSize: 2, autoSave: true },
    createdAt: now,
    updatedAt: now,
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadWorkspace(): Promise<CompilerWorkspace> {
  try {
    // 1. Try loading from IndexedDB first
    const db = await openDB();
    const ws = await new Promise<CompilerWorkspace | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(WORKSPACE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (ws) return ws;

    // 2. Backward compatibility: check for old localStorage workspace data
    const migrated = migrateFromLocalStorage();
    if (migrated) {
      await saveWorkspace(migrated);
      return migrated;
    }

    // 3. Fallback: initialize default workspace
    const defaultWs = getDefaultWorkspace();
    await saveWorkspace(defaultWs);
    return defaultWs;
  } catch (e) {
    console.warn('IndexedDB load error, using default workspace:', e);
    return getDefaultWorkspace();
  }
}

export async function saveWorkspace(workspace: CompilerWorkspace): Promise<void> {
  try {
    const db = await openDB();
    workspace.updatedAt = Date.now();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(workspace);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('IndexedDB save error:', e);
  }
}

export async function resetWorkspace(): Promise<CompilerWorkspace> {
  const defaultWs = getDefaultWorkspace();
  await saveWorkspace(defaultWs);
  return defaultWs;
}

export async function clearWorkspaceData(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(WORKSPACE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('IndexedDB clear error:', e);
  }
}

function migrateFromLocalStorage(): CompilerWorkspace | null {
  if (typeof window === 'undefined') return null;

  const oldKeys = ['bce:playground-virtual-files', 'bce_code_arena_files', 'code_arena_files', 'compiler_files'];
  for (const key of oldKeys) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsedFiles = JSON.parse(raw);
        if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
          const defaultWs = getDefaultWorkspace();
          defaultWs.files = parsedFiles;
          if (parsedFiles[0] && parsedFiles[0].path) {
            defaultWs.activeFileId = parsedFiles[0].path;
          }
          localStorage.removeItem(key);
          return defaultWs;
        }
      } catch (_e) {
        // Ignore JSON parse errors
      }
    }
  }
  return null;
}
