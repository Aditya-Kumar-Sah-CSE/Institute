'use client';

import '@/lib/monacoInit';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import {
  Database as DatabaseIcon,
  Play,
  RotateCcw,
  Eraser,
  Download,
  Table as TableIcon,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileJson,
  Key,
  Layers,
  Sparkles,
  ArrowUpDown,
  Code2
} from 'lucide-react';
import {
  Database,
  SQLExecutionResult,
  createDatabase,
  resetDatabase,
  executeSQL,
  formatSQL,
  getDatabaseSchema,
  exportToCSV,
  exportToJSON,
  SAMPLE_DATASETS
} from '@/lib/sql';
import './SQLEditor.css';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div style={{ padding: 20, color: '#94a3b8' }}>Loading Monaco SQL Editor…</div>
}) as any;

interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  success: boolean;
  rowCount: number;
  executionTimeMs: number;
}

const STARTER_QUERIES: Record<string, string> = {
  employees_departments: `-- Select high-earning employees and their department details
SELECT 
  e.id, 
  e.first_name, 
  e.last_name, 
  e.salary, 
  d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.salary > 70000
ORDER BY e.salary DESC;`,

  ecommerce_store: `-- Aggregated sales summary per product category
SELECT 
  c.category_name, 
  COUNT(p.id) AS total_products, 
  ROUND(AVG(p.price), 2) AS avg_price
FROM categories c
JOIN products p ON c.id = p.category_id
GROUP BY c.category_name
ORDER BY avg_price DESC;`,

  university_system: `-- List courses, instructors, and enrolled student counts
SELECT 
  co.course_code, 
  co.course_name, 
  i.name AS instructor_name, 
  COUNT(en.id) AS total_enrolled
FROM courses co
JOIN instructors i ON co.instructor_id = i.id
LEFT JOIN enrollments en ON co.id = en.course_id
GROUP BY co.id
ORDER BY total_enrolled DESC;`,

  tech_startup: `-- Active enterprise subscriptions and total payment amounts
SELECT 
  u.username, 
  u.company, 
  s.plan_name, 
  s.monthly_rate
FROM users u
JOIN subscriptions s ON u.id = s.user_id
WHERE s.status = 'ACTIVE'
ORDER BY s.monthly_rate DESC;`
};

export default function SQLEditor({
  initialDataset = 'employees_departments',
  height = 'calc(100vh - 100px)'
}: {
  initialDataset?: string;
  height?: string;
}) {
  const [selectedDatasetKey, setSelectedDatasetKey] = useState<string>(initialDataset);
  const [database, setDatabase] = useState<Database>(() => createDatabase(initialDataset));
  const [query, setQuery] = useState<string>(STARTER_QUERIES[initialDataset] || STARTER_QUERIES.employees_departments);
  const [result, setResult] = useState<SQLExecutionResult | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  const [running, setRunning] = useState<boolean>(false);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [mobileTab, setMobileTab] = useState<'all' | 'schema' | 'editor' | 'results'>('all');

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const handleDatasetChange = (key: string) => {
    setSelectedDatasetKey(key);
    const newDb = createDatabase(key);
    setDatabase(newDb);
    setQuery(STARTER_QUERIES[key] || `-- Run queries on ${newDb.name}\nSELECT * FROM ${Object.keys(newDb.tables)[0]};`);
    setResult(null);
    const firstTable = Object.keys(newDb.tables)[0];
    if (firstTable) {
      setExpandedTables({ [firstTable]: true });
    }
  };

  const handleResetDatabase = () => {
    if (confirm('Reset database tables and rows to original sample state?')) {
      const resetDb = resetDatabase(selectedDatasetKey);
      setDatabase(resetDb);
      setResult(null);
    }
  };

  const handleRunQuery = () => {
    if (!query.trim()) return;
    setRunning(true);

    setTimeout(() => {
      const res = executeSQL(query, database);

      if (res.updatedDatabase) {
        setDatabase(res.updatedDatabase);
        const newTableNames = Object.keys(res.updatedDatabase.tables);
        setExpandedTables(prev => {
          const next = { ...prev };
          newTableNames.forEach(tbl => {
            if (next[tbl] === undefined) {
              next[tbl] = true;
            }
          });
          return next;
        });
      }

      setResult(res);
      setPage(1);
      setSortColumn(null);

      const historyItem: QueryHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        query: query.trim(),
        timestamp: new Date().toLocaleTimeString(),
        success: res.success,
        rowCount: res.rowCount,
        executionTimeMs: res.executionTimeMs
      };
      setHistory(prev => [historyItem, ...prev.slice(0, 49)]);

      if (monacoRef.current && editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          if (!res.success && res.error) {
            monacoRef.current.editor.setModelMarkers(model, 'sql-error', [
              {
                startLineNumber: res.error.line || 1,
                startColumn: res.error.column || 1,
                endLineNumber: res.error.line || 1,
                endColumn: (res.error.column || 1) + 10,
                message: res.error.message,
                severity: monacoRef.current.MarkerSeverity.Error
              }
            ]);
          } else {
            monacoRef.current.editor.setModelMarkers(model, 'sql-error', []);
          }
        }
      }

      setRunning(false);
    }, 50);
  };

  const handleFormatSQL = () => {
    const formatted = formatSQL(query);
    setQuery(formatted);
  };

  const handleInsertColumn = (columnName: string) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const position = editor.getPosition();
      editor.executeEdits('insert-column', [
        {
          range: new monacoRef.current.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: columnName,
          forceMoveMarkers: true
        }
      ]);
      editor.focus();
    } else {
      setQuery(prev => prev + ` ${columnName}`);
    }
  };

  const handleSelectTop100 = (tableName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const top100Query = `SELECT * FROM ${tableName} LIMIT 100;`;
    setQuery(top100Query);
    const res = executeSQL(top100Query, database);
    setResult(res);
    setActiveTab('results');
  };

  const handleExportCSV = () => {
    if (!result || !result.success || !result.rows.length) return;
    const csvStr = exportToCSV(result.columns, result.rows);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedDatasetKey}-query-result.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!result || !result.success || !result.rows.length) return;
    const jsonStr = exportToJSON(result.rows);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedDatasetKey}-query-result.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRunQuery();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      handleFormatSQL();
    });
  };

  const schema = getDatabaseSchema(database);

  let displayRows = result?.rows ? [...result.rows] : [];
  if (sortColumn) {
    displayRows.sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      let cmp = 0;
      if (typeof valA === 'number' && typeof valB === 'number') cmp = valA - valB;
      else cmp = String(valA).localeCompare(String(valB));
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }

  const totalPages = Math.ceil(displayRows.length / pageSize) || 1;
  const paginatedRows = displayRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="sql-editor-container" style={{ height }}>
      <div className="sql-toolbar">
        <div className="sql-toolbar-group">
          <div className="sql-title">
            <DatabaseIcon className="w-5 h-5 text-sky-400" />
            <span>Interactive SQL Workspace</span>
          </div>

          <select
            className="sql-select"
            value={selectedDatasetKey}
            onChange={e => handleDatasetChange(e.target.value)}
          >
            {Object.keys(SAMPLE_DATASETS).map(key => (
              <option key={key} value={key}>
                {SAMPLE_DATASETS[key].name}
              </option>
            ))}
          </select>
        </div>

        <div className="sql-toolbar-group">
          <button className="sql-btn sql-btn-primary" onClick={handleRunQuery} disabled={running}>
            <Play className="w-4 h-4 fill-current" />
            {running ? 'Executing...' : 'Run Query (Ctrl+Enter)'}
          </button>

          <button className="sql-btn sql-btn-secondary" onClick={handleFormatSQL} title="Ctrl+Shift+F">
            <Sparkles className="w-4 h-4" />
            Format
          </button>

          <button className="sql-btn sql-btn-secondary" onClick={() => setQuery('')}>
            <Eraser className="w-4 h-4" />
            Clear
          </button>

          <button className="sql-btn sql-btn-danger" onClick={handleResetDatabase} title="Reset database to seed state">
            <RotateCcw className="w-4 h-4" />
            Reset DB
          </button>

          {result && result.success && result.rows.length > 0 && (
            <>
              <button className="sql-btn sql-btn-secondary" onClick={handleExportCSV} title="Export result to CSV">
                <FileSpreadsheet className="w-4 h-4" />
                CSV
              </button>
              <button className="sql-btn sql-btn-secondary" onClick={handleExportJSON} title="Export result to JSON">
                <FileJson className="w-4 h-4" />
                JSON
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Segmented Navigation Bar */}
      <div className="sql-mobile-nav">
        <button
          className={`sql-mobile-tab ${mobileTab === 'all' ? 'active' : ''}`}
          onClick={() => setMobileTab('all')}
        >
          <Layers className="w-4 h-4" /> All
        </button>
        <button
          className={`sql-mobile-tab ${mobileTab === 'schema' ? 'active' : ''}`}
          onClick={() => setMobileTab('schema')}
        >
          <Layers className="w-4 h-4" /> Schema ({schema.length})
        </button>
        <button
          className={`sql-mobile-tab ${mobileTab === 'editor' ? 'active' : ''}`}
          onClick={() => setMobileTab('editor')}
        >
          <Code2 className="w-4 h-4" /> SQL Editor
        </button>
        <button
          className={`sql-mobile-tab ${mobileTab === 'results' ? 'active' : ''}`}
          onClick={() => setMobileTab('results')}
        >
          <TableIcon className="w-4 h-4" /> Results ({result?.rowCount ?? 0})
        </button>
      </div>

      <div className="sql-main-layout">
        <div className={`sql-sidebar ${mobileTab !== 'all' && mobileTab !== 'schema' ? 'hidden md:flex' : ''}`}>
          <div className="sql-sidebar-header">
            <span>Schema Explorer</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          <div className="sql-sidebar-content">
            {schema.map(tbl => {
              const isExpanded = !!expandedTables[tbl.name];
              return (
                <div key={tbl.name} className="sql-table-item">
                  <div
                    className="sql-table-header"
                    onClick={() =>
                      setExpandedTables(prev => ({ ...prev, [tbl.name]: !prev[tbl.name] }))
                    }
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <TableIcon className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="truncate">{tbl.name}</span>
                    </div>

                    <div className="sql-table-actions">
                      <span className="sql-badge sql-badge-count">{tbl.rowCount} r</span>
                      <button
                        className="text-xs text-sky-400 hover:underline px-1"
                        onClick={e => handleSelectTop100(tbl.name, e)}
                        title="Query top 100 rows"
                      >
                        Top 100
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="sql-columns-list">
                      {tbl.columns.map(col => (
                        <div
                          key={col.name}
                          className="sql-column-item"
                          onClick={() => handleInsertColumn(col.name)}
                          title="Click to insert column into SQL editor"
                        >
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            {col.primaryKey ? (
                              <Key className="w-3 h-3 text-amber-400 shrink-0" />
                            ) : (
                              <span className="w-3 h-3 text-slate-600 text-center font-mono shrink-0">#</span>
                            )}
                            <span className="truncate">{col.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {col.primaryKey && <span className="sql-badge sql-badge-pk">PK</span>}
                            {col.foreignKey && <span className="sql-badge sql-badge-fk">FK</span>}
                            <span className="sql-type-label">{col.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className={`sql-editor-workspace ${mobileTab !== 'all' && mobileTab === 'schema' ? 'hidden md:flex' : ''}`}>
          <div className={`sql-editor-panel ${mobileTab === 'results' ? 'hidden md:block' : ''}`}>
            <Suspense fallback={<div style={{ padding: 20, color: '#94a3b8' }}>Loading Monaco SQL Editor…</div>}>
              <Editor
                height="100%"
                language="sql"
                theme="vs-dark"
                value={query}
                onChange={(val: any) => setQuery(val || '')}
                onMount={handleEditorMount}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  fontFamily: 'JetBrains Mono, Fira Code, monospace',
                  automaticLayout: true,
                  padding: { top: 12 }
                }}
              />
            </Suspense>
          </div>

          <div className={`sql-results-panel ${mobileTab === 'editor' ? 'hidden md:flex' : ''}`}>
            <div className="sql-results-tabs">
              <div className="sql-tab-list">
                <button
                  className={`sql-tab ${activeTab === 'results' ? 'active' : ''}`}
                  onClick={() => setActiveTab('results')}
                >
                  Results Grid
                </button>
                <button
                  className={`sql-tab ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  Query History ({history.length})
                </button>
              </div>

              {result && result.success && (
                <div className="sql-stats-badge">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {result.rowCount} rows · {result.executionTimeMs} ms
                  </span>
                </div>
              )}
            </div>

            <div className="sql-results-content">
              {activeTab === 'results' ? (
                result ? (
                  result.success ? (
                    result.columns.length > 0 ? (
                      <table className="sql-data-table">
                        <thead>
                          <tr>
                            {result.columns.map(col => (
                              <th
                                key={col.name}
                                onClick={() => {
                                  if (sortColumn === col.name) {
                                    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
                                  } else {
                                    setSortColumn(col.name);
                                    setSortDirection('asc');
                                  }
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  <span>{col.name}</span>
                                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRows.map((row, idx) => (
                            <tr key={idx}>
                              {result.columns.map(col => {
                                const val = row[col.name];
                                return (
                                  <td key={col.name}>
                                    {val === null || val === undefined ? (
                                      <span className="sql-null-tag">NULL</span>
                                    ) : typeof val === 'boolean' ? (
                                      val ? 'TRUE' : 'FALSE'
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6 text-slate-400 text-sm">
                        {result.message || 'Query executed successfully with zero output rows.'}
                      </div>
                    )
                  ) : (
                    <div className="sql-error-box">
                      <div className="sql-error-title">
                        <AlertCircle className="w-4 h-4" />
                        <span>SQL Syntax / Execution Error</span>
                      </div>
                      <div>{result.error?.message}</div>
                      {result.error?.line && (
                        <div className="text-xs text-rose-300">
                          Line {result.error.line}, Column {result.error.column || 1}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Ctrl + Enter</kbd> to execute SQL query.
                  </div>
                )
              ) : (
                <div className="sql-history-list">
                  {history.length === 0 ? (
                    <div className="p-6 text-slate-500 text-center text-sm">No query history recorded yet in this session.</div>
                  ) : (
                    history.map(item => (
                      <div
                        key={item.id}
                        className="sql-history-item"
                        onClick={() => {
                          setQuery(item.query);
                          setActiveTab('results');
                        }}
                      >
                        <div className="sql-history-query">{item.query}</div>
                        <div className="sql-history-meta">
                          <div className="flex items-center gap-2">
                            {item.success ? (
                              <span className="text-emerald-400 font-semibold">Success</span>
                            ) : (
                              <span className="text-rose-400 font-semibold">Failed</span>
                            )}
                            <span>{item.rowCount} rows</span>
                            <span>{item.executionTimeMs} ms</span>
                          </div>
                          <span>{item.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {activeTab === 'results' && result && result.success && displayRows.length > pageSize && (
              <div className="sql-pagination-bar">
                <span>
                  Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, displayRows.length)} of {displayRows.length} rows
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="sql-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="sql-page-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
