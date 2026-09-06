'use client';

import React, { useState } from 'react';
import { LATEX_TEMPLATES, LatexTemplate } from '@/lib/latex/latexTemplates';
import { Search, Layout, BookOpen, Atom, FlaskConical, FileText, User } from 'lucide-react';

interface TemplateLibraryProps {
  selectedTemplateId: string;
  onSelectTemplate: (template: LatexTemplate) => void;
}

export default function TemplateLibrary({
  selectedTemplateId,
  onSelectTemplate,
}: TemplateLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'all', label: 'All Templates', icon: Layout },
    { id: 'math', label: 'Mathematics', icon: BookOpen },
    { id: 'physics', label: 'Physics', icon: Atom },
    { id: 'chemistry', label: 'Chemistry', icon: FlaskConical },
    { id: 'exam', label: 'Exam Papers', icon: FileText },
    { id: 'resume', label: 'CV & Resumes', icon: User },
  ];

  const filteredTemplates = LATEX_TEMPLATES.filter((tpl) => {
    const matchesCategory = activeCategory === 'all' || tpl.category === activeCategory;
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="template-library-container">
      <div className="template-header">
        <h2>📚 LaTeX Template Library</h2>
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search templates (e.g. calculus, quantum, exam, resume)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="category-tabs">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      <div className="templates-grid">
        {filteredTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className={`template-card ${selectedTemplateId === tpl.id ? 'selected' : ''}`}
            onClick={() => onSelectTemplate(tpl)}
          >
            <div className="template-card-header">
              <span className={`category-badge badge-${tpl.category}`}>{tpl.category}</span>
              <h3>{tpl.name}</h3>
            </div>
            <p className="template-desc">{tpl.description}</p>
            <div className="template-tags">
              {tpl.tags.map((tag) => (
                <span key={tag} className="tag-pill">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
