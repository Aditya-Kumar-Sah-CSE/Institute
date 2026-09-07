'use client';

import React, { useState, useRef, useEffect } from 'react';
import VoiceControls from './VoiceControls';
import TemplateLibrary from './TemplateLibrary';
import LatexCodeEditor from './LatexCodeEditor';
import SymbolToolbar from './SymbolToolbar';
import LatexPreview from './LatexPreview';
import DocumentPreview from './DocumentPreview';
import ExportControls from './ExportControls';
import SyntaxErrorBanner from './SyntaxErrorBanner';
import { LATEX_TEMPLATES, LatexTemplate } from '@/lib/latex/latexTemplates';
import { validateLatex, SyntaxErrorItem } from '@/lib/latex/latexValidator';
import { LatexHistoryManager } from '@/lib/latex/latexHistory';
import { parseVoiceIntent } from '@/lib/latex/voiceCommandParser';
import {
  insertSnippetAtPosition,
  replaceTitleInLatex,
  makeCurrentMatrixSymmetric,
} from '@/lib/latex/latexCommands';
import { Undo, Redo, Sparkles, Eye, FileText, Bot } from 'lucide-react';
import './VoiceLatexEditor.css';

export default function VoiceLatexEditor() {
  const initialTemplate = LATEX_TEMPLATES[0];

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplate.id);
  const [code, setCode] = useState<string>(initialTemplate.code);
  const [cursorPos, setCursorPos] = useState<number>(initialTemplate.code.length);
  const [viewMode, setViewMode] = useState<'katex' | 'document'>('katex');
  const [languageMode, setLanguageMode] = useState<'en-IN' | 'hi-IN' | 'Auto'>('Auto');
  const [agentFeedback, setAgentFeedback] = useState<string | null>(null);
  const [syntaxErrors, setSyntaxErrors] = useState<SyntaxErrorItem[]>([]);

  // History Stack Manager
  const historyRef = useRef<LatexHistoryManager>(
    new LatexHistoryManager(initialTemplate.code, initialTemplate.id)
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryState = (newCode: string, newTemplateId: string, desc: string) => {
    historyRef.current.push(newCode, newTemplateId, desc);
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  };

  // Run syntax validation on code change
  useEffect(() => {
    const errors = validateLatex(code);
    setSyntaxErrors(errors);
  }, [code]);

  // Integration with Existing Smart Learn AI Agent via Custom Event Listener
  useEffect(() => {
    const handleAgentLatexEvent = (e: Event) => {
      const customEvt = e as CustomEvent;
      const detail = customEvt.detail;
      if (!detail) return;

      const initialCode = code;

      if (detail.templateId) {
        const tpl = LATEX_TEMPLATES.find((t) => t.id === detail.templateId);
        if (tpl) {
          setSelectedTemplateId(tpl.id);
          setCode(tpl.code);
          updateHistoryState(tpl.code, tpl.id, `Existing Agent Loaded Template: ${tpl.name}`);
          setAgentFeedback(`Smart Learn AI Agent switched template to "${tpl.name}".`);
        }
      } else if (detail.newTitle || detail.sectionTitle) {
        const titleToUse = detail.newTitle || detail.sectionTitle;
        const updated = replaceTitleInLatex(code, titleToUse);
        if (updated !== initialCode) {
          setCode(updated);
          updateHistoryState(updated, selectedTemplateId, `Existing Agent Replaced Title: ${titleToUse}`);
          setAgentFeedback(`Smart Learn AI Agent updated title to "${titleToUse}".`);
        }
      } else if (detail.action === 'make_symmetric') {
        const symCode = makeCurrentMatrixSymmetric(code);
        if (symCode !== initialCode) {
          setCode(symCode);
          updateHistoryState(symCode, selectedTemplateId, `Existing Agent Made Matrix Symmetric`);
          setAgentFeedback('Smart Learn AI Agent transformed matrix to symmetric.');
        }
      } else if (detail.action === 'undo') {
        handleUndo();
      } else if (detail.action === 'redo') {
        handleRedo();
      } else if (detail.action === 'clear') {
        handleClear();
      } else if (detail.code || detail.snippet) {
        const snippetToInsert = detail.code || detail.snippet;
        const { newCode, newCursorPos } = insertSnippetAtPosition(code, `\n${snippetToInsert}\n`, cursorPos);
        if (newCode !== initialCode) {
          setCode(newCode);
          setCursorPos(newCursorPos);
          updateHistoryState(newCode, selectedTemplateId, `Existing Agent Inserted Snippet`);
          setAgentFeedback('Smart Learn AI Agent inserted LaTeX code snippet.');
        }
      }
    };

    window.addEventListener('bce-update-latex', handleAgentLatexEvent);
    return () => {
      window.removeEventListener('bce-update-latex', handleAgentLatexEvent);
    };
  }, [code, selectedTemplateId, cursorPos]);

  const handleCodeChange = (newCode: string, desc: string = 'Manual Edit') => {
    setCode(newCode);
    updateHistoryState(newCode, selectedTemplateId, desc);
  };

  const handleSelectTemplate = (template: LatexTemplate) => {
    setSelectedTemplateId(template.id);
    setCode(template.code);
    updateHistoryState(template.code, template.id, `Loaded Template: ${template.name}`);
    setAgentFeedback(`Template switched to "${template.name}".`);
  };

  const handleInsertSnippet = (snippet: string) => {
    const { newCode, newCursorPos } = insertSnippetAtPosition(code, snippet, cursorPos);
    setCode(newCode);
    setCursorPos(newCursorPos);
    updateHistoryState(newCode, selectedTemplateId, `Inserted snippet`);
    setAgentFeedback('LaTeX snippet inserted.');
  };

  const handleUndo = () => {
    if (!historyRef.current.canUndo()) {
      setAgentFeedback('Undo nahi ho sakta — start of history reached.');
      return;
    }
    const prev = historyRef.current.undo();
    if (prev) {
      setCode(prev.code);
      setSelectedTemplateId(prev.selectedTemplateId);
      setCanUndo(historyRef.current.canUndo());
      setCanRedo(historyRef.current.canRedo());
      setAgentFeedback('Last change undo ho gaya.');
    }
  };

  const handleRedo = () => {
    if (!historyRef.current.canRedo()) {
      setAgentFeedback('Redo nahi ho sakta — end of history reached.');
      return;
    }
    const next = historyRef.current.redo();
    if (next) {
      setCode(next.code);
      setSelectedTemplateId(next.selectedTemplateId);
      setCanUndo(historyRef.current.canUndo());
      setCanRedo(historyRef.current.canRedo());
      setAgentFeedback('Redo applied.');
    }
  };

  const handleClear = () => {
    const emptyCode = '\\documentclass{article}\n\\begin{document}\n\n\\end{document}';
    setCode(emptyCode);
    updateHistoryState(emptyCode, selectedTemplateId, 'Clear Editor');
    setAgentFeedback('Editor clear ho gaya hai.');
  };

  // Direct Voice Command Intent Processing
  const handleTranscriptReceived = (rawTranscript: string) => {
    const parsed = parseVoiceIntent(rawTranscript);
    const initialCode = code;

    // Dispatch event so existing Smart Learn AI Agent context is notified
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bce-update-latex', {
        detail: {
          transcript: rawTranscript,
          intent: parsed.intent,
          type: parsed.type,
          params: parsed.params
        }
      }));
    }

    switch (parsed.intent) {
      case 'undo':
        handleUndo();
        break;

      case 'redo':
        handleRedo();
        break;

      case 'clear_editor':
        handleClear();
        break;

      case 'copy_code':
        navigator.clipboard.writeText(code);
        setAgentFeedback('LaTeX code clipboard par copy ho gaya.');
        break;

      case 'export_file':
        setAgentFeedback('Export controls active hain.');
        break;

      case 'replace_title':
        if (parsed.params?.newTitle) {
          const updated = replaceTitleInLatex(code, parsed.params.newTitle);
          if (updated !== initialCode) {
            handleCodeChange(updated, `Voice Title Replace`);
            setAgentFeedback(`Title replace ho gaya: "${parsed.params.newTitle}".`);
          } else {
            setAgentFeedback('Title replace nahi ho paya — editor unchanged.');
          }
        }
        break;

      case 'switch_template':
        if (parsed.params?.templateId) {
          const tpl = LATEX_TEMPLATES.find((t) => t.id === parsed.params!.templateId);
          if (tpl) {
            handleSelectTemplate(tpl);
          } else {
            setAgentFeedback('Requested template nahi mila.');
          }
        }
        break;

      case 'make_symmetric':
        const symCode = makeCurrentMatrixSymmetric(code);
        if (symCode !== initialCode) {
          handleCodeChange(symCode, `Voice Make Symmetric`);
          setAgentFeedback('Matrix symmetric bana diya gaya hai.');
        } else {
          setAgentFeedback('No matrix found to transform.');
        }
        break;

      case 'insert_math':
        if (parsed.params?.code) {
          const { newCode, newCursorPos } = insertSnippetAtPosition(code, `\n${parsed.params.code}\n`, cursorPos);
          if (newCode !== initialCode) {
            setCode(newCode);
            setCursorPos(newCursorPos);
            updateHistoryState(newCode, selectedTemplateId, `Voice Insert Math`);
            setAgentFeedback(`Math snippet (${parsed.type || 'math'}) insert ho gaya.`);
          } else {
            setAgentFeedback('Insert operation failed — editor unchanged.');
          }
        }
        break;

      default:
        setAgentFeedback(`Voice command: "${rawTranscript}"`);
        break;
    }
  };

  return (
    <div className="voice-latex-workspace">
      {/* Top Header Banner */}
      <header className="workspace-header">
        <div className="brand-group">
          <div className="brand-badge">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1>Smart Learn Voice LaTeX Workspace</h1>
            <p>Integrated with existing Smart Learn AI Agent (Hinglish &amp; English Voice Control)</p>
          </div>
        </div>
      </header>

      {/* Existing AI Agent Voice Control Bar */}
      <VoiceControls
        onTranscriptReceived={handleTranscriptReceived}
        lastFeedback={agentFeedback}
        languageMode={languageMode}
        onLanguageChange={setLanguageMode}
      />

      {/* Symbol Shortcut Toolbar */}
      <SymbolToolbar onInsertSnippet={handleInsertSnippet} />

      {/* Main Grid: Code Editor on Left, Live Preview on Right */}
      <div className="workspace-main-grid">
        <div className="left-pane">
          <LatexCodeEditor
            code={code}
            onChange={(newCode) => handleCodeChange(newCode, 'Manual Typing')}
            onSelectionChange={setCursorPos}
            onClear={handleClear}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
          <SyntaxErrorBanner errors={syntaxErrors} />
        </div>

        <div className="right-pane">
          <div className="preview-tab-bar">
            <button
              className={`preview-tab-btn ${viewMode === 'katex' ? 'active' : ''}`}
              onClick={() => setViewMode('katex')}
            >
              <Eye className="w-4 h-4" />
              <span>KaTeX Math View</span>
            </button>
            <button
              className={`preview-tab-btn ${viewMode === 'document' ? 'active' : ''}`}
              onClick={() => setViewMode('document')}
            >
              <FileText className="w-4 h-4" />
              <span>Document Paper View</span>
            </button>
          </div>

          <div className="preview-render-container">
            {viewMode === 'katex' ? (
              <LatexPreview code={code} />
            ) : (
              <DocumentPreview code={code} />
            )}
          </div>

          <ExportControls code={code} />
        </div>
      </div>

      {/* Template Catalog Section */}
      <TemplateLibrary
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
}
