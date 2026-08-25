'use client';

import React, { useEffect, useRef, useState } from 'react';
import { WebContainer } from '@webcontainer/api';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

let webcontainerInstance: WebContainer | null = null;

export default function TerminalWorkspace({ files }: { files: any }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [booting, setBooting] = useState(true);
  const shellProcessRef = useRef<any>(null);

  useEffect(() => {
    let term: Terminal;
    let fitAddon: FitAddon;

    async function init() {
      if (!terminalRef.current) return;

      term = new Terminal({
        fontFamily: '"Fira Code", monospace',
        fontSize: 12,
        theme: {
          background: '#00000000', // Transparent
          foreground: '#f8fafc',
          cursor: '#06b6d4',
        }
      });
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      // Boot WebContainer
      if (!webcontainerInstance) {
        try {
          webcontainerInstance = await WebContainer.boot();
        } catch (e: any) {
          term.write(`\n\x1b[1;31mError booting WebContainer: ${e.message}\x1b[0m\n`);
          setBooting(false);
          return;
        }
      }
      
      // Sync files
      if (files && files.length > 0) {
        const fileSystemTree: any = {};
        const processNode = (node: any, treeRef: any) => {
          if (node.kind === 'file') {
            treeRef[node.name] = { file: { contents: node.content || '' } };
          } else if (node.kind === 'directory' && node.children) {
            treeRef[node.name] = { directory: {} };
            node.children.forEach((child: any) => processNode(child, treeRef[node.name].directory));
          }
        };
        files.forEach((f: any) => processNode(f, fileSystemTree));
        
        try {
          await webcontainerInstance.mount(fileSystemTree);
        } catch(e) {
          console.warn("Could not mount all files", e);
        }
      }

      setBooting(false);

      // Start shell
      const shellProcess = await webcontainerInstance.spawn('jsh', {
        terminal: {
          cols: term.cols,
          rows: term.rows,
        },
      });
      shellProcessRef.current = shellProcess;
      
      shellProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            term.write(data);
          }
        })
      );
      
      const input = shellProcess.input.getWriter();
      term.onData((data) => {
        input.write(data);
      });

      const handleResize = () => {
        fitAddon.fit();
        if (shellProcessRef.current) {
          shellProcessRef.current.resize({
            cols: term.cols,
            rows: term.rows,
          });
        }
      };
      
      window.addEventListener('resize', handleResize);
    }
    
    init();

    return () => {
      term?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0a0a', padding: '8px' }}>
      {booting && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', color: 'var(--neon-cyan)', zIndex: 10, fontSize: '12px' }}>
          Booting Isolated Engine...
        </div>
      )}
      <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
