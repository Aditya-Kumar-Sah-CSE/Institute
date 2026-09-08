'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'xterm/css/xterm.css';

// ── sessionStorage keys (scoped per-tab, never shared across tabs/users) ──
const SS_CWD = 'bce:terminal:cwd';
const SS_HISTORY = 'bce:terminal:history';
const MAX_HISTORY = 200;

function loadCwd(): string {
  try { return sessionStorage.getItem(SS_CWD) || ''; } catch { return ''; }
}
function saveCwd(cwd: string) {
  try { sessionStorage.setItem(SS_CWD, cwd); } catch { /* noop */ }
}
function loadHistory(): string[] {
  try {
    const raw = sessionStorage.getItem(SS_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHistory(history: string[]) {
  try {
    sessionStorage.setItem(SS_HISTORY, JSON.stringify(history.slice(-MAX_HISTORY)));
  } catch { /* noop */ }
}

interface TerminalWorkspaceProps {
  onCommandComplete?: () => void;
}

export default function TerminalWorkspace({ onCommandComplete }: TerminalWorkspaceProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [booting, setBooting] = useState(true);
  const shellCwdRef = useRef<string>(loadCwd());
  const abortControllerRef = useRef<AbortController | null>(null);
  const initRef = useRef(false); // prevent double-init in StrictMode

  useEffect(() => {
    if (initRef.current || !terminalRef.current) return;
    initRef.current = true;

    let term: any;
    let fitAddon: any;
    let isDisposed = false;

    async function initXterm() {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('xterm'),
        import('xterm-addon-fit')
      ]);

      if (isDisposed || !terminalRef.current) return;

      term = new Terminal({
        fontFamily: '"Fira Code", Menlo, Monaco, Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.2,
        theme: {
          background: '#0a0a0a',
          foreground: '#f8fafc',
          cursor: '#06b6d4',
          cursorAccent: '#0a0a0a',
          selectionBackground: 'rgba(6, 182, 212, 0.3)',
        },
        cursorBlink: true,
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      setBooting(false);

      // Shell state — restore from sessionStorage
      let lineBuffer = '';
      const commandHistory: string[] = loadHistory();
      let historyIndex = commandHistory.length;

      // Interactive stdin state
      let isReadingStdin = false;
      let stdinCommand = '';
      let stdinLines: string[] = [];
      let stdinLineBuffer = '';

      const getPrompt = () => {
        const virtualPath = shellCwdRef.current ? `~/workspace/${shellCwdRef.current}` : '~/workspace';
        return `\x1b[1;36m${virtualPath}\x1b[0m \x1b[1;32m$\x1b[0m `;
      };

      const printPrompt = () => {
        term.write(`\r\n${getPrompt()}`);
      };

      // Welcome Message
      term.writeln('\x1b[1;32m===================================================\x1b[0m');
      term.writeln('\x1b[1;36m  Welcome to Smart Learn Sandbox Browser Shell   \x1b[0m');
      term.writeln('\x1b[1;32m===================================================\x1b[0m');
      if (shellCwdRef.current) {
        term.writeln(`\x1b[2;37mSession restored — cwd: ~/workspace/${shellCwdRef.current}\x1b[0m`);
      }
      term.writeln('Compile C++: \x1b[33mg++ main.cpp -o main\x1b[0m & execute: \x1b[33m./main\x1b[0m');
      term.writeln('Compile Java: \x1b[33mjavac Main.java\x1b[0m & execute: \x1b[33mjava Main\x1b[0m');
      term.writeln('Run Python: \x1b[33mpython solve.py\x1b[0m | Node.js: \x1b[33mnode script.js\x1b[0m');
      term.write(getPrompt());

      const executeCommand = async (cmdLine: string, stdinData: string = '') => {
        abortControllerRef.current = new AbortController();
        
        try {
          term.write('\r\n\x1b[2;37mRunning...\x1b[0m\r\n');
          
          const response = await fetch('/api/code-arena/terminal/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              command: cmdLine, 
              cwd: shellCwdRef.current,
              stdin: stdinData 
            }),
            signal: abortControllerRef.current.signal
          });

          if (!response.ok) {
            const errData = await response.json();
            term.write(`\x1b[1;31mError: ${errData.error || 'Server error'}\x1b[0m\r\n`);
            printPrompt();
            return;
          }

          const data = await response.json();
          
          // Print stdout
          if (data.stdout) {
            term.write(data.stdout.replace(/\n/g, '\r\n'));
          }
          // Print stderr
          if (data.stderr) {
            term.write(`\x1b[1;31m${data.stderr.replace(/\n/g, '\r\n')}\x1b[0m`);
          }

          // Update working directory if changed — persist to sessionStorage
          if (typeof data.cwd === 'string') {
            shellCwdRef.current = data.cwd;
            saveCwd(data.cwd);
          }

          // Trigger file tree refresh
          if (onCommandComplete) {
            onCommandComplete();
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            term.write('\r\n\x1b[1;31mProcess terminated.\x1b[0m\r\n');
          } else {
            term.write(`\r\n\x1b[1;31mExecution failed: ${err.message || err}\x1b[0m\r\n`);
          }
        } finally {
          abortControllerRef.current = null;
          printPrompt();
        }
      };

      // Terminal Key Event Handler
      term.onData((data: string) => {
        if (abortControllerRef.current) {
          // Process is executing. If Ctrl+C is pressed, abort process
          if (data === '\x03') { // Ctrl+C
            abortControllerRef.current.abort();
          }
          return;
        }

        // If reading stdin interactively
        if (isReadingStdin) {
          if (data === '\x03') { // Ctrl+C to cancel stdin
            term.write('^C\r\n\x1b[1;31mCancelled.\x1b[0m');
            isReadingStdin = false;
            stdinCommand = '';
            stdinLines = [];
            stdinLineBuffer = '';
            printPrompt();
            return;
          }

          if (data === '\x04') { // Ctrl+D to trigger execution
            term.write('\r\n[Executing with stdin...]');
            isReadingStdin = false;
            const fullStdin = stdinLines.join('\n') + (stdinLineBuffer ? '\n' : '') + stdinLineBuffer;
            executeCommand(stdinCommand, fullStdin);
            stdinCommand = '';
            stdinLines = [];
            stdinLineBuffer = '';
            return;
          }

          if (data === '\r') { // Enter
            stdinLines.push(stdinLineBuffer);
            stdinLineBuffer = '';
            term.write('\r\n');
            return;
          }

          if (data === '\x7f' || data === '\x08') { // Backspace
            if (stdinLineBuffer.length > 0) {
              stdinLineBuffer = stdinLineBuffer.slice(0, -1);
              term.write('\b \b');
            }
            return;
          }

          // Echo and buffer readable character
          if (data.charCodeAt(0) >= 32) {
            stdinLineBuffer += data;
            term.write(data);
          }
          return;
        }

        // Normal terminal input
        if (data === '\r') { // Enter
          const cmd = lineBuffer.trim();
          term.write('\r\n');
          
          if (cmd) {
            commandHistory.push(lineBuffer);
            historyIndex = commandHistory.length;
            saveHistory(commandHistory); // persist history
            
            // Check if command is a code runner that might need stdin
            const parts = cmd.split(' ');
            const isRunner = parts[0] === 'python' || parts[0] === 'python3' || parts[0] === 'java' || parts[0] === 'node' || parts[0].startsWith('./');
            
            if (isRunner) {
              // Prompt user for stdin input
              isReadingStdin = true;
              stdinCommand = cmd;
              term.writeln('\x1b[33m[Reading Stdin. Press Enter for next line, Ctrl+D to Execute, Ctrl+C to Cancel]\x1b[0m');
              term.write('> ');
            } else {
              executeCommand(cmd);
            }
          } else {
            printPrompt();
          }
          lineBuffer = '';
          return;
        }

        if (data === '\x7f' || data === '\x08') { // Backspace
          if (lineBuffer.length > 0) {
            lineBuffer = lineBuffer.slice(0, -1);
            term.write('\b \b');
          }
          return;
        }

        if (data === '\x03') { // Ctrl+C
          term.write('^C');
          lineBuffer = '';
          printPrompt();
          return;
        }

        // Handle Arrow Up / Down for history
        if (data === '\u001b[A') { // Up Arrow
          if (commandHistory.length > 0 && historyIndex > 0) {
            historyIndex--;
            term.write('\b \b'.repeat(lineBuffer.length));
            lineBuffer = commandHistory[historyIndex];
            term.write(lineBuffer);
          }
          return;
        }
        if (data === '\u001b[B') { // Down Arrow
          if (commandHistory.length > 0 && historyIndex < commandHistory.length) {
            historyIndex++;
            term.write('\b \b'.repeat(lineBuffer.length));
            if (historyIndex === commandHistory.length) {
              lineBuffer = '';
            } else {
              lineBuffer = commandHistory[historyIndex];
              term.write(lineBuffer);
            }
          }
          return;
        }

        // Echo printable character
        if (data.charCodeAt(0) >= 32) {
          lineBuffer += data;
          term.write(data);
        }
      });
    }

    initXterm();

    const handleResize = () => {
      if (fitAddon) fitAddon.fit();
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', handleResize);
      term?.dispose();
      initRef.current = false;
    };
  }, [onCommandComplete]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0a0a', padding: '8px' }}>
      {booting && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', color: 'var(--neon-cyan)', zIndex: 10, fontSize: '12px' }}>
          Initializing terminal...
        </div>
      )}
      <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
