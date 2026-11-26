/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const SCRATCH = 'C:\\Users\\adity\\.gemini\\antigravity\\brain\\ed784ced-db8d-4166-864b-0892b363871e\\scratch';
const OUT_DIR = path.resolve(__dirname, '../../src/features/code-arena/data');

function cleanFooter(lines) {
  return lines
    .map((l) => l.replace(/\f/g, '').trimEnd())
    .filter((l) => {
      const t = l.trim();
      if (/^Placement Aptitude Practice Book\s+\d+\s*$/.test(t)) return false;
      if (/^Unofficial practice mock\s+\d+\s*$/.test(t)) return false;
      return true;
    });
}

function classifyTopic(questionText, sectionName) {
  const q = questionText.toLowerCase();
  if (sectionName === 'Verbal Ability') {
    return { topic: 'Sentence Completion & Grammar', chapter_number: 40 };
  }
  if (/sit in a row|facing north|facing south|circular table|persons? [p-u]\b/.test(q)) {
    return /circular table/.test(q)
      ? { topic: 'Permutation & Combination', chapter_number: 16 }
      : { topic: 'Linear Arrangement', chapter_number: 27 };
  }
  if (/how is [a-z] related to|daughter of|mother of|father of|brother of|sister of|wife of|husband of|\bson of\b/.test(q)) {
    return { topic: 'Blood Relations', chapter_number: 26 };
  }
  if (/average/.test(q)) {
    return { topic: 'Averages', chapter_number: 14 };
  }
  if (/invests|out of a profit|share \(rs\)|partner/.test(q)) {
    return { topic: 'Ratio & Partnership', chapter_number: 11 };
  }
  if (/present age|years ago|year\(s\) ago|years from now|father will be|\bsons?\b/.test(q)) {
    return { topic: 'Problems on Ages', chapter_number: 12 };
  }
  if (/remainder|divisible by|unit digit|mod\b|integers from/.test(q)) {
    return { topic: 'Number System', chapter_number: 2 };
  }
  if (/\bhcf\b|\blcm\b/.test(q)) {
    return { topic: 'HCF & LCM', chapter_number: 3 };
  }
  if (/x\^2|x \+ y|algebra|simplify/.test(q)) {
    return { topic: 'Simplification & Algebra', chapter_number: 1 };
  }
  if (/election|votes|%|\bpercent\b/.test(q) && !/area|discount|marked|simple interest|compound/.test(q)) {
    return { topic: 'Percentage', chapter_number: 4 };
  }
  if (/simple interest|sum becomes \d+ times/.test(q)) {
    return { topic: 'Simple Interest', chapter_number: 5 };
  }
  if (/difference .* between compound and simple|compound interest/.test(q)) {
    return { topic: 'Compound Interest', chapter_number: 6 };
  }
  if (/installment/.test(q)) {
    return { topic: 'Installments', chapter_number: 7 };
  }
  if (/trader marks|discount|profit|loss|cost price|selling price/.test(q)) {
    return { topic: 'Profit, Loss & Discount', chapter_number: 8 };
  }
  if (/can do a (work|job)|more days does|finish it\?/.test(q)) {
    return { topic: 'Time & Work', chapter_number: 9 };
  }
  if (/pipes|tank|empties|filling time|cistern/.test(q)) {
    return { topic: 'Pipes & Cisterns', chapter_number: 10 };
  }
  if (/pure milk|removed and replaced|mixture|alligation/.test(q)) {
    return { topic: 'Mixtures & Alligation', chapter_number: 13 };
  }
  if (/pie chart|units sold|like tea/.test(q)) {
    return { topic: 'DI & Set Theory', chapter_number: 15 };
  }
  if (/committee|\d+-digit|all digits different|identical chocolates|ways can/.test(q)) {
    return { topic: 'Permutation & Combination', chapter_number: 16 };
  }
  if (/probability|balls|drawn together/.test(q)) {
    return { topic: 'Probability', chapter_number: 17 };
  }
  if (/\btrains?\b|platform|cross a pole|cross each other/.test(q)) {
    return { topic: 'Problems on Trains', chapter_number: 19 };
  }
  if (/boat|still water|downstream|stream speed/.test(q)) {
    return { topic: 'Boats & Streams', chapter_number: 20 };
  }
  if (/km\/h|catch|starts from|\bspeed\b/.test(q)) {
    return { topic: 'Time, Speed & Distance', chapter_number: 18 };
  }
  if (/\barea\b|square is|circle|cylinder|cone|perimeter|volume|diagonal/.test(q)) {
    return { topic: 'Mensuration', chapter_number: 21 };
  }
  if (/next term/.test(q)) {
    return { topic: 'Number Series', chapter_number: 32 };
  }
  if (/written as|alphabet position|in a code/.test(q)) {
    return { topic: 'Coding-Decoding', chapter_number: 23 };
  }
  if (/walks|faces north|faces south|faces east|faces west|turns right|turns left|shortest distance/.test(q)) {
    return { topic: 'Direction Sense', chapter_number: 25 };
  }
  if (/in a row|position \d+ from|how many people/.test(q)) {
    return { topic: 'Ranking & Order', chapter_number: 38 };
  }
  if (/smaller angle|between the hands/.test(q)) {
    return { topic: 'Clocks', chapter_number: 36 };
  }
  if (/what day|monday|tuesday|wednesday|thursday|friday|saturday|sunday/.test(q)) {
    return { topic: 'Calendar', chapter_number: 37 };
  }
  if (/statements:|conclusions:/.test(q)) {
    return { topic: 'Syllogism', chapter_number: 31 };
  }
  return {
    topic: sectionName.includes('Reasoning') ? 'Logical Reasoning' : 'Quantitative Aptitude',
    chapter_number: sectionName.includes('Reasoning') ? 23 : 1,
  };
}

function parseOptionsBlock(text) {
  const opts = {};
  const matches = [...text.matchAll(/\(([A-D])\)\s*/g)];
  if (matches.length >= 4) {
    // Take the last 4 matches corresponding to A, B, C, D in order
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const letter = m[1];
      const start = m.index + m[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      opts[letter] = text.slice(start, end).replace(/\s+/g, ' ').trim();
    }
  }
  return opts;
}

function parseCppBook() {
  const raw = fs.readFileSync(path.join(SCRATCH, 'cpp_book.txt'), 'utf8');
  const lines = cleanFooter(raw.split(/\r?\n/));

  // Locate start indices of chapters 1..47 (after line 205), Passage Recall section, and C++ Coding section
  const chapStarts = [];
  let verbalExtraStart = -1;
  let codingStart = -1;

  for (let i = 200; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === 'Verbal: Passage Recall and Email Writing') {
      verbalExtraStart = i;
      continue;
    }
    if (t === 'C++ Coding Practice') {
      codingStart = i;
      break;
    }
    const cm = t.match(/^(\d+)\.\s+(?!\([A-D]\))(.+)$/);
    if (cm && verbalExtraStart === -1) {
      const num = Number(cm[1]);
      if (num >= 1 && num <= 47 && num === chapStarts.length + 1) {
        chapStarts.push({ num, title: cm[2].trim(), idx: i });
      }
    }
  }

  const chapters = [];
  const questions = [];
  let globalQ = 1;
  const issues = [];

  for (let cIdx = 0; cIdx < chapStarts.length; cIdx++) {
    const ch = chapStarts[cIdx];
    const endIdx = cIdx + 1 < chapStarts.length ? chapStarts[cIdx + 1].idx : verbalExtraStart;
    const chLines = lines.slice(ch.idx + 1, endIdx);

    const category =
      ch.num <= 22 ? 'Quantitative Aptitude' : ch.num <= 38 ? 'Logical Reasoning' : 'Verbal Ability';

    let theory = [];
    let shortTricks = [];
    let solvedExample = [];
    let ansStart = chLines.findIndex((l) => l.trim().startsWith(`Answers and Solutions:`));
    if (ansStart === -1) {
      issues.push(`Chapter ${ch.num} missing Answers and Solutions`);
      ansStart = chLines.length;
    }

    const qStartIdx = chLines.findIndex((l) => /^Level \d+:/i.test(l.trim()) || /^Q1\./.test(l.trim()));
    const headerLines = chLines.slice(0, qStartIdx === -1 ? ansStart : qStartIdx);

    let mode = null;
    for (const hl of headerLines) {
      const t = hl.trim();
      if (!t || t === 'Quantitative Aptitude' || t === 'Logical Reasoning' || t === 'Verbal Ability') continue;
      if (t === 'Theory / Concept') { mode = 'theory'; continue; }
      if (t === 'Short Tricks') { mode = 'tricks'; continue; }
      if (t === 'Solved Example') { mode = 'example'; continue; }
      const cleaned = t.replace(/^-\s*/, '');
      if (mode === 'theory') {
        if (t.startsWith('-') || theory.length === 0) theory.push(cleaned);
        else theory[theory.length - 1] += ' ' + t;
      } else if (mode === 'tricks') {
        if (t.startsWith('-') || shortTricks.length === 0) shortTricks.push(cleaned);
        else shortTricks[shortTricks.length - 1] += ' ' + t;
      } else if (mode === 'example') {
        solvedExample.push(t);
      }
    }

    // Parse answers first
    const ansLines = chLines.slice(ansStart + 1);
    const ansBlocks = [];
    for (const al of ansLines) {
      const t = al.trim();
      if (!t) continue;
      const am = t.match(/^(\d+)\.\s*\(([A-D])\)\s*(.*)$/);
      if (am) {
        ansBlocks.push({ qNum: Number(am[1]), opt: am[2], rest: am[3] });
      } else if (ansBlocks.length > 0) {
        ansBlocks[ansBlocks.length - 1].rest += ' ' + t;
      }
    }
    const ansMap = {};
    for (const ab of ansBlocks) {
      const dashIdx = ab.rest.indexOf(' - ');
      const correctAns = dashIdx !== -1 ? ab.rest.slice(0, dashIdx).trim() : ab.rest.trim();
      const explanation = dashIdx !== -1 ? ab.rest.slice(dashIdx + 3).trim() : ab.rest.trim();
      ansMap[ab.qNum] = { correct_option: ab.opt, correct_answer: correctAns, explanation };
    }

    // Parse chapter questions
    const qBodyLines = chLines.slice(qStartIdx === -1 ? 0 : qStartIdx, ansStart);
    let currentLevel = 'Basic';
    let currentDiff = 'EASY';
    const rawQs = [];
    for (const ql of qBodyLines) {
      const t = ql.trim();
      if (!t) continue;
      const lm = t.match(/^Level\s+\d+:\s*(Basic|Medium|Advance)/i);
      if (lm) {
        currentLevel = lm[1][0].toUpperCase() + lm[1].slice(1).toLowerCase();
        currentDiff = currentLevel === 'Advance' ? 'HARD' : currentLevel === 'Medium' ? 'MEDIUM' : 'EASY';
        continue;
      }
      const qm = t.match(/^Q(\d+)\.\s*(.*)$/);
      if (qm) {
        rawQs.push({
          chQ: Number(qm[1]),
          level_label: currentLevel,
          difficulty: currentDiff,
          lines: [qm[2]],
        });
      } else if (rawQs.length > 0) {
        rawQs[rawQs.length - 1].lines.push(t);
      }
    }

    const startQ = globalQ;
    for (const rq of rawQs) {
      const joined = rq.lines.join('\n').trim();
      let stem = '';
      let options = {};
      let imageUrl = null;

      if (ch.num === 35) {
        // Non-Verbal diagram question: figure & options (A)(B)(C)(D) are rendered in /images/tcs-nonverbal/q{chQ}.png
        stem = joined.replace(/\s*Question\s+\(A\)\s+\(B\)\s+\(C\)\s+\(D\)\s*$/i, '').replace(/\s+/g, ' ').trim();
        imageUrl = `/images/tcs-nonverbal/q${rq.chQ}.png`;
        options = {
          A: 'Option (A) — see diagram above',
          B: 'Option (B) — see diagram above',
          C: 'Option (C) — see diagram above',
          D: 'Option (D) — see diagram above',
        };
      } else {
        const firstOptIdx = joined.search(/\(\s*A\s*\)\s*/);
        if (firstOptIdx === -1) {
          issues.push(`Ch ${ch.num} Q${rq.chQ}: missing (A) option`);
          stem = joined;
        } else {
          stem = joined.slice(0, firstOptIdx).replace(/\s*\n\s*/g, '\n').trim();
          const optPart = joined.slice(firstOptIdx);
          options = parseOptionsBlock(optPart);
        }
      }

      if (Object.keys(options).length !== 4) {
        issues.push(`Ch ${ch.num} Q${rq.chQ}: parsed ${Object.keys(options).length} options`);
      }

      const ans = ansMap[rq.chQ];
      if (!ans) {
        issues.push(`Ch ${ch.num} Q${rq.chQ}: missing answer`);
      }

      questions.push({
        question_number: globalQ,
        chapter_number: ch.num,
        chapter_question_number: rq.chQ,
        category,
        section: `${ch.num}. ${ch.title}`,
        chapter_title: ch.title,
        level_label: rq.level_label,
        difficulty: rq.difficulty,
        question: stem,
        options,
        correct_option: ans ? ans.correct_option : 'A',
        correct_answer: ans ? ans.correct_answer : '',
        explanation: ans ? ans.explanation : '',
        image_url: imageUrl,
      });
      globalQ++;
    }

    chapters.push({
      chapter_number: ch.num,
      title: ch.title,
      category,
      question_count: rawQs.length,
      start_q: startQ,
      end_q: globalQ - 1,
      theory,
      short_tricks: shortTricks,
      solved_example: solvedExample.join(' ').trim(),
    });
  }

  // Parse Passage Recall (8) and Email Writing (3)
  const extraLines = lines.slice(verbalExtraStart + 1, codingStart);
  const emailHeaderIdx = extraLines.findIndex((l) => l.trim() === 'Email Writing');
  const prLines = extraLines.slice(0, emailHeaderIdx);
  const emLines = extraLines.slice(emailHeaderIdx + 1);

  const drills = [];
  let drillOrder = 1;

  // Passage Recalls
  let curPr = null;
  for (const pl of prLines) {
    const t = pl.trim();
    if (!t || t === 'Passage Recall' || t.startsWith('Screenshot ke mutabik') || t.startsWith('lagwao ya') || t.startsWith('grammar. Word-to-word')) continue;
    const pm = t.match(/^Passage\s+(\d+)$/);
    if (pm) {
      if (curPr) drills.push(curPr);
      curPr = {
        drill_code: `PR-${pm[1]}`,
        drill_type: 'PASSAGE_RECALL',
        order_index: drillOrder++,
        title: `Passage Recall ${pm[1]}`,
        difficulty: 'MEDIUM',
        prompt: '',
        sample_input: 'Read for 30 seconds -> Text hides -> Type recalled key points in 90 seconds',
        sample_output: '',
        hint: 'Focus on names, day/time, problem cause, action taken, and outcome — exact word-for-word phrasing is not required.',
        solution_text: '',
        solution_code: null,
        meta: { read_seconds: 30, write_seconds: 90, keywords: [] },
      };
    } else if (curPr) {
      curPr.prompt = curPr.prompt ? `${curPr.prompt} ${t}` : t;
    }
  }
  if (curPr) drills.push(curPr);
  for (const d of drills.filter((x) => x.drill_type === 'PASSAGE_RECALL')) {
    d.solution_text = d.prompt;
    const words = d.prompt
      .replace(/[^a-zA-Z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !['with', 'that', 'this', 'from', 'they', 'their', 'were', 'when', 'after', 'before', 'about', 'only', 'first', 'then', 'some', 'each'].includes(w.toLowerCase()));
    d.meta.keywords = Array.from(new Set(words.map((w) => w.toLowerCase()))).slice(0, 12);
  }

  // Email Writings
  let emIdx = 1;
  let curEm = null;
  let emMode = 'prompt';
  for (const el of emLines) {
    const t = el.trim();
    if (!t || t.startsWith('Screenshot ke mutabik') || t.startsWith('Request/next step')) continue;
    const tm = t.match(/^Task:\s*(.+)$/);
    if (tm) {
      if (curEm) drills.push(curEm);
      curEm = {
        drill_code: `EM-${emIdx}`,
        drill_type: 'EMAIL_WRITING',
        order_index: drillOrder++,
        title: `Email Writing ${emIdx}: ${tm[1].trim()}`,
        difficulty: 'MEDIUM',
        prompt: '',
        sample_input: '540 seconds (9 minutes) | Subject + Greeting + Purpose + Details + Closing',
        sample_output: '',
        hint: 'Cover every mentioned point concisely in formal business English with a clear Subject, Greeting, and Sign-off.',
        solution_text: '',
        solution_code: null,
        meta: { time_seconds: 540, keywords: [] },
      };
      emIdx++;
      emMode = 'prompt';
      continue;
    }
    if (!curEm) continue;
    if (t.startsWith('Sample - ')) {
      emMode = 'sample';
      curEm.solution_text = t.replace(/^Sample -\s*/, '');
    } else if (emMode === 'prompt') {
      curEm.prompt = curEm.prompt ? `${curEm.prompt} ${t}` : t;
    } else {
      curEm.solution_text += '\n' + el.replace(/^\s{4}/, '');
    }
  }
  if (curEm) drills.push(curEm);
  for (const d of drills.filter((x) => x.drill_type === 'EMAIL_WRITING')) {
    const m = d.prompt.match(/Mention:\s*([^.]+)/i);
    if (m) {
      d.meta.keywords = m[1]
        .split(/,|;/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  // Parse C++ Coding Problems (P1..P23)
  const codeLines = lines.slice(codingStart + 1);
  let curLevel = 'Basic';
  let curP = null;
  let codeMode = 'desc';
  for (const cl of codeLines) {
    const t = cl.trim();
    if (!t || t === 'C++ Basics' || t.startsWith('Fast revision:') || t.startsWith('compile hue hain') || t.startsWith('In programs me')) continue;
    const lm = t.match(/^Level:\s*(.+)$/i);
    if (lm) {
      curLevel = lm[1].trim();
      continue;
    }
    const pm = t.match(/^P(\d+)\.\s*(.+)$/);
    if (pm) {
      if (curP) drills.push(curP);
      const diff = curLevel === 'Medium' ? 'HARD' : curLevel === 'Easy-Medium' ? 'MEDIUM' : 'EASY';
      curP = {
        drill_code: `CPP-${pm[1]}`,
        drill_type: 'CODING',
        order_index: drillOrder++,
        title: `P${pm[1]}. ${pm[2].trim()}`,
        difficulty: diff,
        prompt: '',
        sample_input: '',
        sample_output: '',
        hint: '',
        solution_text: '',
        solution_code: '',
        meta: { level_label: curLevel, problem_number: Number(pm[1]) },
      };
      codeMode = 'desc';
      continue;
    }
    if (!curP) continue;
    if (t.startsWith('Sample input:')) {
      curP.sample_input = t.replace(/^Sample input:\s*/i, '').trim();
      codeMode = 'in';
    } else if (t.startsWith('Sample output:')) {
      curP.sample_output = t.replace(/^Sample output:\s*/i, '').trim();
      codeMode = 'out';
    } else if (t.startsWith('Hint:')) {
      curP.hint = t.replace(/^Hint:\s*/i, '').trim();
      codeMode = 'hint';
    } else if (t.startsWith('Solution (C++17)')) {
      codeMode = 'code';
    } else if (codeMode === 'desc') {
      curP.prompt = curP.prompt ? `${curP.prompt} ${t}` : t;
    } else if (codeMode === 'hint') {
      curP.hint += ' ' + t;
    } else if (codeMode === 'code') {
      const stripped = cl.replace(/^\s{4}/, '');
      curP.solution_code = curP.solution_code ? `${curP.solution_code}\n${stripped}` : stripped;
    }
  }
  if (curP) drills.push(curP);

  return { chapters, questions, drills, issues };
}

function parseMockFile(filename) {
  const raw = fs.readFileSync(path.join(SCRATCH, filename), 'utf8');
  const lines = cleanFooter(raw.split(/\r?\n/));

  // Locate each "Mock Test Paper N" and "Paper N: Answer Key and Solutions"
  const paperStarts = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const pm = t.match(/^Mock Test Paper\s+(\d+)$/);
    if (pm) {
      paperStarts.push({ paperNumber: Number(pm[1]), startIdx: i });
    }
  }

  const papers = [];
  const issues = [];

  for (let pIdx = 0; pIdx < paperStarts.length; pIdx++) {
    const ps = paperStarts[pIdx];
    const nextStart = pIdx + 1 < paperStarts.length ? paperStarts[pIdx + 1].startIdx : lines.length;
    const pLines = lines.slice(ps.startIdx + 1, nextStart);

    const ansHeaderIdx = pLines.findIndex((l) => l.trim().startsWith(`Paper ${ps.paperNumber}: Answer Key and Solutions`));
    if (ansHeaderIdx === -1) {
      issues.push(`Paper ${ps.paperNumber}: missing Answer Key header`);
      continue;
    }

    const qArea = pLines.slice(0, ansHeaderIdx);
    const solArea = pLines.slice(ansHeaderIdx + 1);

    // Parse Questions Q1..Q81 from qArea
    const rawItems = [];
    let currentSection = 'Numerical Ability';
    let currentSecMinutes = 25;
    let curItem = null;

    for (let i = 0; i < qArea.length; i++) {
      const rawLine = qArea[i];
      const t = rawLine.trim();
      if (!t || /^Time:\s*191 minutes/.test(t) || t.startsWith('Passage Recall (har passage') || t.startsWith('Ek baar me ek hi passage')) {
        continue;
      }
      if (/^Numerical Ability\b/.test(t)) { currentSection = 'Numerical Ability'; currentSecMinutes = 25; continue; }
      if (/^Reasoning Ability\b/.test(t)) { currentSection = 'Reasoning Ability'; currentSecMinutes = 25; continue; }
      if (/^Advanced Quantitative and Reasoning\b/.test(t)) { currentSection = 'Advanced Quantitative and Reasoning'; currentSecMinutes = 25; continue; }
      if (/^Verbal Ability\b/.test(t)) { currentSection = 'Verbal Ability'; currentSecMinutes = 26; continue; }

      const qm = t.match(/^Q(\d+)\.\s*(.*)$/);
      if (qm) {
        if (curItem) rawItems.push(curItem);
        const qNum = Number(qm[1]);
        const head = qm[2].trim();
        if (qNum >= 75 && qNum <= 78) {
          currentSection = 'Verbal Ability';
          currentSecMinutes = 26;
        } else if (qNum === 79) {
          currentSection = 'Verbal Ability';
          currentSecMinutes = 26;
        } else if (qNum === 80) {
          currentSection = 'Advanced Coding Easy';
          currentSecMinutes = 35;
        } else if (qNum === 81) {
          currentSection = 'Advanced Coding Medium';
          currentSecMinutes = 55;
        }
        curItem = {
          qNum,
          section: currentSection,
          sectionMinutes: currentSecMinutes,
          head,
          lines: head ? [rawLine.trim()] : [],
        };
      } else if (curItem) {
        curItem.lines.push(rawLine);
      }
    }
    if (curItem) rawItems.push(curItem);

    // Parse Solutions from solArea
    const solExplanations = {};
    let solKeyGrid = {};
    let solPassagesCheck = '';
    let solEmailSample = '';
    let q80Sol = { title: '', notes: '', code: '' };
    let q81Sol = { title: '', notes: '', code: '' };

    let solMode = 'grid';
    let lastMcqSol = 0;

    for (let i = 0; i < solArea.length; i++) {
      const rawLine = solArea[i];
      const t = rawLine.trim();
      if (!t || /^Q\s+Ans\b/.test(t) || /^Score:\s*Numerical/.test(t) || /^\(self-check\)/.test(t)) continue;

      if (t.startsWith('Q75-Q78:')) { solMode = 'pr'; solPassagesCheck = t; continue; }
      if (t.startsWith('Q79:')) { solMode = 'email'; solEmailSample = t.replace(/^Q79:\s*Sample email\s*-\s*/i, ''); continue; }
      if (t.startsWith('Q80.')) { solMode = 'q80'; q80Sol.title = t.replace(/^Q80\.\s*/, '').trim(); continue; }
      if (t.startsWith('Q81.')) { solMode = 'q81'; q81Sol.title = t.replace(/^Q81\.\s*/, '').trim(); continue; }

      if (solMode === 'grid') {
        const expMatch = t.match(/^(\d+)\.\s*\(([A-D])\)\s*(.*)$/);
        if (expMatch && Number(expMatch[1]) <= 74) {
          const qN = Number(expMatch[1]);
          lastMcqSol = qN;
          solKeyGrid[qN] = expMatch[2];
          const rest = expMatch[3];
          const dashIdx = rest.indexOf(' - ');
          solExplanations[qN] = {
            correct_option: expMatch[2],
            correct_answer: dashIdx !== -1 ? rest.slice(0, dashIdx).trim() : rest.trim(),
            explanation: dashIdx !== -1 ? rest.slice(dashIdx + 3).trim() : rest.trim(),
          };
          continue;
        }
        if (lastMcqSol > 0) {
          solExplanations[lastMcqSol].explanation += ' ' + t;
          continue;
        }
        // Check table pairs: "1  B   2  D"
        const pairs = [...t.matchAll(/(\d+)\s+([A-D])/g)];
        for (const p of pairs) {
          solKeyGrid[Number(p[1])] = p[2];
        }
      } else if (solMode === 'pr') {
        solPassagesCheck += ' ' + t;
      } else if (solMode === 'email') {
        solEmailSample += '\n' + rawLine.replace(/^\s{5}/, '');
      } else if (solMode === 'q80' || solMode === 'q81') {
        const target = solMode === 'q80' ? q80Sol : q81Sol;
        if (!target.code && (t.startsWith('#include') || t.startsWith('using namespace') || /^\s{10,}/.test(rawLine))) {
          target.code = rawLine.replace(/^\s{11}/, '');
        } else if (target.code) {
          target.code += '\n' + rawLine.replace(/^\s{11}/, '');
        } else {
          target.notes = target.notes ? `${target.notes} ${t}` : t;
        }
      }
    }

    // Build final 81 items
    const items = [];
    for (const ri of rawItems) {
      const qNum = ri.qNum;
      if (qNum <= 74) {
        // MCQ
        const joined = ri.lines
          .map((l, idx) => (idx === 0 ? l.replace(/^Q\d+\.\s*/, '') : l.trim()))
          .join('\n')
          .trim();
        const firstOptIdx = joined.search(/\(\s*A\s*\)\s*/);
        const stem = firstOptIdx !== -1 ? joined.slice(0, firstOptIdx).trim() : joined;
        const opts = firstOptIdx !== -1 ? parseOptionsBlock(joined.slice(firstOptIdx)) : {};
        const sol = solExplanations[qNum];
        const cls = classifyTopic(stem, ri.section);

        if (Object.keys(opts).length !== 4 || !sol) {
          issues.push(`Paper ${ps.paperNumber} Q${qNum}: opts=${Object.keys(opts).length}, sol=${!!sol}`);
        }

        items.push({
          question_number: qNum,
          item_type: 'MCQ',
          section: ri.section,
          section_minutes: ri.sectionMinutes,
          topic: cls.topic,
          chapter_number: cls.chapter_number,
          difficulty: ri.section.includes('Advanced') ? 'HARD' : qNum >= 55 ? 'EASY' : 'MEDIUM',
          question: stem,
          options: opts,
          correct_option: sol?.correct_option || solKeyGrid[qNum] || 'A',
          correct_answer: sol?.correct_answer || '',
          explanation: sol?.explanation || '',
        });
      } else if (qNum >= 75 && qNum <= 78) {
        const body = ri.lines
          .slice(1)
          .map((l) => l.trim())
          .filter(Boolean)
          .join(' ');
        const kws = Array.from(
          new Set(
            body
              .replace(/[^a-zA-Z0-9\s-]/g, ' ')
              .split(/\s+/)
              .filter((w) => w.length >= 4 && !['with', 'that', 'this', 'from', 'they', 'their', 'were', 'when', 'after', 'before', 'about', 'only', 'every', 'should'].includes(w.toLowerCase()))
              .map((w) => w.toLowerCase())
          )
        ).slice(0, 12);

        items.push({
          question_number: qNum,
          item_type: 'PASSAGE_RECALL',
          section: 'Verbal Ability',
          section_minutes: 26,
          topic: 'Passage Recall',
          chapter_number: 39,
          difficulty: 'MEDIUM',
          title: `Passage Recall (${qNum - 74}/4)`,
          question: body,
          read_seconds: 30,
          write_seconds: 90,
          keywords: kws,
          checklist: solPassagesCheck.trim(),
        });
      } else if (qNum === 79) {
        const promptBody = ri.lines
          .map((l, idx) => (idx === 0 ? l.replace(/^Q79\.\s*Email Writing\s*\(\d+\s*seconds\):\s*/i, '') : l.trim()))
          .filter(Boolean)
          .join(' ');
        const titleM = ri.head.match(/Email Writing\s*\(\d+\s*seconds\):\s*(.+)$/i);
        const mentionM = promptBody.match(/Mention:\s*([^\n]+)/i);
        const rawPoints = mentionM
          ? mentionM[1]
              .replace(/Subject, greeting.*$/i, '')
              .split(/,|;/)
              .map((s) => s.trim().replace(/\.$/, ''))
              .filter(Boolean)
          : [];

        items.push({
          question_number: 79,
          item_type: 'EMAIL_WRITING',
          section: 'Verbal Ability',
          section_minutes: 26,
          topic: 'Email Writing',
          chapter_number: 43,
          difficulty: 'MEDIUM',
          title: titleM ? titleM[1].trim() : 'Formal Email Writing',
          question: promptBody,
          time_seconds: 540,
          checklist_points: rawPoints,
          sample_solution: solEmailSample.trim(),
        });
      } else if (qNum === 80 || qNum === 81) {
        const titleM = ri.head.match(/Advanced Coding\s+(Easy|Medium)\s*\(\d+\s*minutes\):\s*(.+)$/i);
        let title = titleM ? titleM[2].trim() : `Coding Problem Q${qNum}`;
        const linesCopy = ri.lines.slice(1).map((l) => l.trim());
        // Handle wrapped title line (like Paper 12 Q81 "Longest Palindromic Substring \n Length")
        if (linesCopy[0] && linesCopy[0].length < 25 && !linesCopy[0].includes(':') && !linesCopy[0].includes('karo') && !linesCopy[0].includes('batao')) {
          title = `${title} ${linesCopy.shift()}`.trim();
        }
        let desc = [];
        let inputSpec = '';
        let outputSpec = '';
        let constraints = '';
        let sampleInput = [];
        let sampleOutput = [];
        let cMode = 'desc';
        for (const cl of linesCopy) {
          if (!cl) continue;
          if (cl.startsWith('Input:')) { inputSpec = cl.replace(/^Input:\s*/, ''); cMode = 'meta'; continue; }
          if (cl.startsWith('Output:')) { outputSpec = cl.replace(/^Output:\s*/, ''); cMode = 'meta'; continue; }
          if (cl.startsWith('Constraints:')) { constraints = cl.replace(/^Constraints:\s*/, ''); cMode = 'meta'; continue; }
          if (cl === 'Sample Input') { cMode = 'sin'; continue; }
          if (cl === 'Sample Output') { cMode = 'sout'; continue; }
          if (cMode === 'desc') desc.push(cl);
          else if (cMode === 'sin') sampleInput.push(cl);
          else if (cMode === 'sout') sampleOutput.push(cl);
        }

        const solObj = qNum === 80 ? q80Sol : q81Sol;
        items.push({
          question_number: qNum,
          item_type: 'CODING',
          section: qNum === 80 ? 'Advanced Coding Easy' : 'Advanced Coding Medium',
          section_minutes: qNum === 80 ? 35 : 55,
          topic: qNum === 80 ? 'C++ Coding (Easy)' : 'C++ Coding (Medium)',
          chapter_number: 47,
          difficulty: qNum === 80 ? 'MEDIUM' : 'HARD',
          title,
          question: desc.join(' '),
          input_spec: inputSpec,
          output_spec: outputSpec,
          constraints,
          sample_input: sampleInput.join('\n').trim(),
          sample_output: sampleOutput.join('\n').trim(),
          editorial_notes: solObj.notes,
          solution_code: solObj.code.trim(),
        });
      }
    }

    papers.push({
      paper_number: ps.paperNumber,
      title: `TCS Pattern Mock Test Paper ${ps.paperNumber}`,
      total_minutes: 191,
      total_items: items.length,
      sections: [
        { key: 'numerical', name: 'Numerical Ability', questions: 20, minutes: 25, q_range: [1, 20] },
        { key: 'reasoning', name: 'Reasoning Ability', questions: 20, minutes: 25, q_range: [21, 40] },
        { key: 'advanced', name: 'Advanced Quantitative and Reasoning', questions: 14, minutes: 25, q_range: [41, 54] },
        { key: 'verbal', name: 'Verbal Ability', questions: 25, minutes: 26, q_range: [55, 79] },
        { key: 'coding_easy', name: 'Advanced Coding Easy', questions: 1, minutes: 35, q_range: [80, 80] },
        { key: 'coding_medium', name: 'Advanced Coding Medium', questions: 1, minutes: 55, q_range: [81, 81] },
      ],
      items,
    });
  }

  return { papers, issues };
}

const prep = parseCppBook();
const set1 = parseMockFile('tcs_mock_set1.txt');
const set2 = parseMockFile('tcs_mock_set2.txt');
const allMocks = [...set1.papers, ...set2.papers].sort((a, b) => a.paper_number - b.paper_number);

console.log('=== PREP BOOK AUDIT ===');
console.log('Chapters:', prep.chapters.length);
console.log('MCQs:', prep.questions.length);
console.log('Drills:', prep.drills.length, '(PR:', prep.drills.filter((d) => d.drill_type === 'PASSAGE_RECALL').length, 'EM:', prep.drills.filter((d) => d.drill_type === 'EMAIL_WRITING').length, 'CPP:', prep.drills.filter((d) => d.drill_type === 'CODING').length + ')');
console.log('Prep issues:', prep.issues.length, prep.issues.slice(0, 15));

console.log('\n=== MOCK PAPERS AUDIT ===');
console.log('Papers parsed:', allMocks.length);
allMocks.forEach((m) => {
  const mcqs = m.items.filter((x) => x.item_type === 'MCQ').length;
  const prs = m.items.filter((x) => x.item_type === 'PASSAGE_RECALL').length;
  const ems = m.items.filter((x) => x.item_type === 'EMAIL_WRITING').length;
  const codes = m.items.filter((x) => x.item_type === 'CODING').length;
  const missingCodeSol = m.items.filter((x) => x.item_type === 'CODING' && !x.solution_code).length;
  console.log(`Paper ${m.paper_number}: total=${m.total_items} (MCQ=${mcqs}, PR=${prs}, EM=${ems}, Code=${codes}, missingCodeSol=${missingCodeSol})`);
});
const mockIssues = [...set1.issues, ...set2.issues];
console.log('Mock issues:', mockIssues.length, mockIssues.slice(0, 15));

fs.writeFileSync(path.join(OUT_DIR, 'tcs-syllabus-prep.json'), JSON.stringify(prep, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'tcs-mock-papers.json'), JSON.stringify(allMocks, null, 2));
console.log('\nWrote JSON files cleanly to', OUT_DIR);
