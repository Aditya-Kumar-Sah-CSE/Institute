import type { CodeLanguage } from '../types';

export interface CompilerFile {
  id: string;
  name: string;
  path: string;
  kind: 'file' | 'directory';
  language?: CodeLanguage;
  content: string;
  isDirty?: boolean;
  createdAt: number;
  updatedAt: number;
  children?: CompilerFile[];
}

export interface CompilerTestcase {
  id: number;
  stdin: string;
  expectedOutput: string;
}

export interface CompilerSettings {
  theme?: string;
  fontSize?: number;
  tabSize?: number;
  autoSave?: boolean;
}

export interface CompilerWorkspace {
  id: string;
  name: string;
  activeFileId: string;
  files: CompilerFile[];
  language: CodeLanguage;
  testcases: CompilerTestcase[];
  activeTestcaseIdx: number;
  compilerSettings: CompilerSettings;
  createdAt: number;
  updatedAt: number;
}

export type SaveStatus = 'Saved locally' | 'Saving...' | 'Local save unavailable' | 'Unsaved changes';
