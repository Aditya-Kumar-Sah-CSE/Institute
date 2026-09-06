export type IntentType =
  | 'insert_math'
  | 'switch_template'
  | 'replace_title'
  | 'make_symmetric'
  | 'undo'
  | 'redo'
  | 'copy_code'
  | 'export_file'
  | 'clear_editor'
  | 'unknown';

export interface ParsedVoiceCommand {
  intent: IntentType;
  type?: string;
  params?: Record<string, any>;
  rawTranscript: string;
  confidence: number;
}

export function parseVoiceIntent(rawTranscript: string): ParsedVoiceCommand {
  const text = rawTranscript.toLowerCase().trim();
  if (!text) {
    return { intent: 'unknown', rawTranscript, confidence: 0 };
  }

  if (
    text.includes('undo') ||
    text.includes('last change') ||
    text.includes('piche jao') ||
    text.includes('reverse karo') ||
    text.includes('wapas lo')
  ) {
    return { intent: 'undo', rawTranscript, confidence: 0.95 };
  }

  if (
    text.includes('redo') ||
    text.includes('aage jao') ||
    text.includes('dobara karo') ||
    text.includes('again karo')
  ) {
    return { intent: 'redo', rawTranscript, confidence: 0.95 };
  }

  if (
    text.includes('copy') ||
    text.includes('code copy') ||
    text.includes('copy karo')
  ) {
    return { intent: 'copy_code', rawTranscript, confidence: 0.95 };
  }

  if (
    text.includes('clear') ||
    text.includes('reset') ||
    text.includes('saaf karo') ||
    text.includes('hata do')
  ) {
    return { intent: 'clear_editor', rawTranscript, confidence: 0.95 };
  }

  if (
    text.includes('export') ||
    text.includes('download') ||
    text.includes('save file') ||
    text.includes('png export') ||
    text.includes('pdf export') ||
    text.includes('tex file')
  ) {
    return { intent: 'export_file', rawTranscript, confidence: 0.9 };
  }

  if (
    text.includes('title') ||
    text.includes('naam change') ||
    text.includes('heading change')
  ) {
    let newTitle = text
      .replace(/.*title\s*(ko|to|is|=)?\s*/i, '')
      .replace(/(karo|set karo|change|badlo|make it|rakho).*/i, '')
      .trim();

    if (!newTitle) newTitle = 'Quantum Mechanics';
    return {
      intent: 'replace_title',
      params: { newTitle },
      rawTranscript,
      confidence: 0.9,
    };
  }

  if (
    text.includes('template') ||
    text.includes('layout') ||
    text.includes('mode switch')
  ) {
    let targetTemplate = 'calculus-integrals';
    if (text.includes('physics') || text.includes('quantum')) {
      targetTemplate = 'quantum-mechanics';
    } else if (text.includes('chem') || text.includes('reaction')) {
      targetTemplate = 'chemistry-thermodynamics';
    } else if (text.includes('matrix') || text.includes('algebra') || text.includes('linear')) {
      targetTemplate = 'linear-algebra-matrices';
    } else if (text.includes('exam') || text.includes('test') || text.includes('question')) {
      targetTemplate = 'exam-paper-template';
    } else if (text.includes('resume') || text.includes('cv') || text.includes('bio')) {
      targetTemplate = 'academic-cv-resume';
    }

    return {
      intent: 'switch_template',
      params: { templateId: targetTemplate },
      rawTranscript,
      confidence: 0.9,
    };
  }

  if (text.includes('symmetric') || text.includes('symmetric matrix')) {
    return { intent: 'make_symmetric', rawTranscript, confidence: 0.95 };
  }

  if (
    text.includes('integral') ||
    text.includes('integrate') ||
    text.includes('integration')
  ) {
    let lower = '0';
    let upper = '\\infty';
    if (text.includes('a se b') || text.includes('a to b')) {
      lower = 'a';
      upper = 'b';
    } else if (text.includes('-infinity') || text.includes('minus infinity')) {
      lower = '-\\infty';
    }

    return {
      intent: 'insert_math',
      type: 'integral',
      params: { lower, upper, code: `\\int_{${lower}}^{${upper}} f(x) \\, dx` },
      rawTranscript,
      confidence: 0.9,
    };
  }

  if (text.includes('matrix') || text.includes('array')) {
    let rows = 3;
    let cols = 3;
    if (text.includes('2 by 2') || text.includes('2x2') || text.includes('2*2')) {
      rows = 2;
      cols = 2;
    } else if (text.includes('4 by 4') || text.includes('4x4')) {
      rows = 4;
      cols = 4;
    }

    return {
      intent: 'insert_math',
      type: 'matrix',
      params: { rows, cols },
      rawTranscript,
      confidence: 0.9,
    };
  }

  if (text.includes('quadratic') || text.includes('formula') || text.includes('shridharacharya')) {
    return {
      intent: 'insert_math',
      type: 'quadratic',
      params: { code: `x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}` },
      rawTranscript,
      confidence: 0.9,
    };
  }

  if (text.includes('summation') || text.includes('sigma') || text.includes('sum')) {
    return {
      intent: 'insert_math',
      type: 'summation',
      params: { code: `\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}` },
      rawTranscript,
      confidence: 0.9,
    };
  }

  if (text.includes('derivative') || text.includes('differentiation') || text.includes('dy/dx')) {
    return {
      intent: 'insert_math',
      type: 'derivative',
      params: { code: `\\frac{d}{dx}\\left( f(x) \\right) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}` },
      rawTranscript,
      confidence: 0.9,
    };
  }

  if (text.includes('fraction') || text.includes('divide') || text.includes('bata')) {
    return {
      intent: 'insert_math',
      type: 'fraction',
      params: { code: `\\frac{\\text{numerator}}{\\text{denominator}}` },
      rawTranscript,
      confidence: 0.85,
    };
  }

  return {
    intent: 'insert_math',
    type: 'generic',
    params: { code: `\\text{${rawTranscript}}` },
    rawTranscript,
    confidence: 0.5,
  };
}
