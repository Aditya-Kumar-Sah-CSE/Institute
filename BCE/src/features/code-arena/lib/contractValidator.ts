/**
 * Universal Output Contract System for BCE Code Arena.
 * Validates problem results across return values, mutated in-place parameters,
 * order-sensitive/insensitive outputs, floating-point tolerance, and multi-param state.
 */

import type { ContractType, OrderingRequirement, OutputContract, ProblemSignature } from '../types';

export type { ContractType, OrderingRequirement, OutputContract, ProblemSignature };

export interface ExecutionCapturedState {
  returnValue: any;
  afterState: Record<string, any>; // param0 / name -> final value
  rawStdout?: string;
  stderr?: string;
}

export interface ValidationResult {
  passed: boolean;
  mismatchInfo?: string;
  actualFormatted: string;
  expectedFormatted: string;
}

/**
 * Safely parses JSON or string representations of arrays/values,
 * including array representations with unquoted wildcards e.g. [2,2,_,_] or [0,1,4,0,3,_,_,_].
 */
export function safeParseValue(raw: any): any {
  if (raw === undefined || raw === null) return raw;
  if (typeof raw !== 'string') return raw;
  const str = raw.trim();
  if (!str) return str;

  // 1. Standard JSON Parse
  try {
    return JSON.parse(str);
  } catch {}

  // 2. Array with unquoted wildcards or placeholders e.g. "[2,2,_,_]"
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const sanitized = str
        .replace(/\b_\b/g, '"_"')
        .replace(/\b\*\b/g, '"*"');
      return JSON.parse(sanitized);
    } catch {}
  }

  // 3. String numbers
  if (!isNaN(Number(str)) && str !== '') {
    return Number(str);
  }

  return str;
}

/**
 * Resolves or auto-infers the OutputContract for a problem.
 */
export function resolveContract(signature: ProblemSignature | null | undefined, expectedRaw: string): OutputContract {
  if (signature && signature.outputContract) {
    return signature.outputContract;
  }

  const funcName = (signature?.name || '').toLowerCase();
  const retType = (signature?.return?.type || '').toLowerCase();
  const firstParamName = signature?.params?.[0]?.name || 'nums';

  // Rule 1: Void return -> mutated parameter contract
  if (retType === 'void' || retType === 'null') {
    return {
      type: 'mutated_parameter',
      targetParam: firstParamName,
      ordering: 'exact',
    };
  }

  // Rule 2: Explicit pattern match in expectedRaw (e.g. "5, nums = [0,1,4,0,3]" or "k = 2, nums = [2,2,_,_]")
  const commaEqualsMatch = expectedRaw && expectedRaw.match(/^(?:k\s*=\s*)?([^\s,\[\{]+)\s*,\s*([a-zA-Z0-9_]+)\s*=\s*([\s\S]+)$/);
  if (commaEqualsMatch) {
    const isUnordered = funcName.includes('removeelement') || funcName.includes('remove_element');
    return {
      type: 'return_and_mutation',
      targetParam: commaEqualsMatch[2].trim(),
      lengthRef: 'return_value',
      ordering: isUnordered ? 'unordered' : 'exact',
    };
  }

  // Rule 3: Known LeetCode function names (removeElement, removeDuplicates)
  if (funcName === 'removeelement' || funcName === 'remove_element') {
    return {
      type: 'return_and_mutation',
      targetParam: firstParamName,
      lengthRef: 'return_value',
      ordering: 'unordered',
    };
  }

  if (funcName === 'removeduplicates' || funcName === 'remove_duplicates') {
    return {
      type: 'return_and_mutation',
      targetParam: firstParamName,
      lengthRef: 'return_value',
      ordering: 'exact',
    };
  }

  // Rule 4: Group Anagrams
  if (funcName === 'groupanagrams' || funcName === 'group_anagrams') {
    return {
      type: 'return_value',
      ordering: 'unordered_groups',
    };
  }

  // Fallback: return value validation
  return {
    type: 'return_value',
    ordering: 'exact',
  };
}

/**
 * Parses expected output string into structured expected return & parameter values.
 */
export interface ParsedExpected {
  expectedReturn?: any;
  expectedParams?: Record<string, any>;
  raw: string;
}

export function parseExpectedOutput(expectedRaw: string): ParsedExpected {
  if (!expectedRaw || typeof expectedRaw !== 'string') {
    return { raw: String(expectedRaw || '') };
  }

  const str = expectedRaw.trim();

  // JSON parse
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      const retKey = Object.keys(obj).find((k) => ['return', 'k', 'ret', 'returnValue'].includes(k));
      const expectedReturn = retKey ? safeParseValue(obj[retKey]) : undefined;
      const expectedParams: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (k !== retKey) expectedParams[k] = safeParseValue(v);
      }
      return { expectedReturn, expectedParams, raw: str };
    } catch {}
  }

  // Pattern 1: "5, nums = [0,1,4,0,3]" or "k = 2, nums = [2,2,_,_]"
  const commaEqualsMatch = str.match(/^(?:k\s*=\s*)?([^\s,\[\{]+)\s*,\s*([a-zA-Z0-9_]+)\s*=\s*([\s\S]+)$/);
  if (commaEqualsMatch) {
    const rawRet = commaEqualsMatch[1].trim();
    const paramName = commaEqualsMatch[2].trim();
    const rawParamVal = commaEqualsMatch[3].trim();

    const expectedReturn = safeParseValue(rawRet);
    const expectedParamVal = safeParseValue(rawParamVal);

    return {
      expectedReturn,
      expectedParams: {
        [paramName]: expectedParamVal,
        param0: expectedParamVal,
        arg0: expectedParamVal,
        nums: expectedParamVal,
      },
      raw: str,
    };
  }

  // Pattern 2: "2, [2,2,_,_]" or "5, [0,1,4,0,3]"
  const commaArrayMatch = str.match(/^(?:k\s*=\s*)?([^\s,\[\{]+)\s*,\s*(\[\s*[\s\S]*\])$/);
  if (commaArrayMatch) {
    const rawRet = commaArrayMatch[1].trim();
    const rawParamVal = commaArrayMatch[2].trim();

    const expectedReturn = safeParseValue(rawRet);
    const expectedParamVal = safeParseValue(rawParamVal);

    return {
      expectedReturn,
      expectedParams: {
        nums: expectedParamVal,
        param0: expectedParamVal,
        arg0: expectedParamVal,
      },
      raw: str,
    };
  }

  // Single value
  const expectedReturn = safeParseValue(str);

  return { expectedReturn, raw: str };
}

/**
 * Universal Value Comparator supporting exact, unordered, group-unordered, and float tolerance.
 */
export function compareValues(
  actual: any,
  expected: any,
  options: { ordering?: OrderingRequirement; floatTolerance?: number; length?: number } = {}
): boolean {
  const { ordering = 'exact', floatTolerance, length } = options;

  let act = safeParseValue(actual);
  let exp = safeParseValue(expected);

  // Slicing arrays if length constraint applies (e.g. first k elements)
  if (Array.isArray(act) && typeof length === 'number' && length >= 0) {
    act = act.slice(0, length);
  }
  if (Array.isArray(exp) && typeof length === 'number' && length >= 0) {
    exp = exp.slice(0, length);
  }

  if (act === exp) return true;

  if (typeof act === 'string' && typeof exp === 'number' && act.trim() !== '' && !isNaN(Number(act))) {
    act = Number(act);
  } else if (typeof exp === 'string' && typeof act === 'number' && exp.trim() !== '' && !isNaN(Number(exp))) {
    exp = Number(exp);
  }

  if (typeof act === 'number' && typeof exp === 'number') {
    if (typeof floatTolerance === 'number' && floatTolerance > 0) {
      return Math.abs(act - exp) <= floatTolerance;
    }
    return Math.abs(act - exp) < 1e-7;
  }

  if (Array.isArray(act) && Array.isArray(exp)) {
    if (act.length !== exp.length) return false;

    if (ordering === 'unordered') {
      const actFiltered = act.filter((x: any) => x !== '_' && x !== '*');
      const expFiltered = exp.filter((x: any) => x !== '_' && x !== '*');
      if (actFiltered.length !== expFiltered.length) return false;
      const sortedAct = [...actFiltered].sort(canonicalSort);
      const sortedExp = [...expFiltered].sort(canonicalSort);
      return compareValues(sortedAct, sortedExp, { ordering: 'exact', floatTolerance });
    }

    if (ordering === 'unordered_groups') {
      const normAct = act.map((item) => (Array.isArray(item) ? [...item].sort(canonicalSort) : item)).sort(canonicalSort);
      const normExp = exp.map((item) => (Array.isArray(item) ? [...item].sort(canonicalSort) : item)).sort(canonicalSort);
      return compareValues(normAct, normExp, { ordering: 'exact', floatTolerance });
    }

    for (let i = 0; i < act.length; i++) {
      if (exp[i] === '_' || exp[i] === '*') continue; // Wildcard match
      if (!compareValues(act[i], exp[i], { ordering: 'exact', floatTolerance })) {
        return false;
      }
    }
    return true;
  }

  if (act && exp && typeof act === 'object' && typeof exp === 'object') {
    const actKeys = Object.keys(act);
    const expKeys = Object.keys(exp);
    if (actKeys.length !== expKeys.length) return false;

    for (const key of expKeys) {
      if (!compareValues(act[key], exp[key], { ordering, floatTolerance })) {
        return false;
      }
    }
    return true;
  }

  if (typeof act === 'string' && typeof exp === 'string') {
    const normAct = act.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();
    const normExp = exp.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();
    return normAct === normExp;
  }

  return false;
}

function canonicalSort(a: any, b: any): number {
  const strA = typeof a === 'object' ? JSON.stringify(a) : String(a);
  const strB = typeof b === 'object' ? JSON.stringify(b) : String(b);
  return strA.localeCompare(strB);
}

/**
 * Universal Contract Validator Main Entry Point.
 */
export function validateContract(
  signature: ProblemSignature | null | undefined,
  captured: ExecutionCapturedState,
  expectedRaw: string
): ValidationResult {
  const contract = resolveContract(signature, expectedRaw);
  const parsedExp = parseExpectedOutput(expectedRaw);

  const { type, targetParam, ordering = 'exact', floatTolerance } = contract;

  // Case 1: Return Value Only
  if (type === 'return_value') {
    const passed = compareValues(captured.returnValue, parsedExp.expectedReturn, { ordering, floatTolerance });
    const actualFormatted = formatVal(captured.returnValue);
    const expectedFormatted = formatVal(parsedExp.expectedReturn ?? parsedExp.raw);

    return {
      passed,
      actualFormatted,
      expectedFormatted,
      mismatchInfo: passed ? undefined : `Expected ${expectedFormatted}, got ${actualFormatted}`,
    };
  }

  // Helper to extract mutated target parameter value
  const paramKey = String(targetParam ?? 'param0');
  const actualParamVal =
    captured.afterState[paramKey] ??
    captured.afterState['nums'] ??
    captured.afterState['arg0'] ??
    captured.afterState['param0'] ??
    Object.values(captured.afterState)[0];

  const expectedParamVal =
    parsedExp.expectedParams?.[paramKey] ??
    parsedExp.expectedParams?.['nums'] ??
    parsedExp.expectedParams?.['arg0'] ??
    parsedExp.expectedParams?.['param0'] ??
    parsedExp.expectedReturn;

  // Case 2: Mutated Parameter Only (e.g. Move Zeroes, Rotate Array)
  if (type === 'mutated_parameter') {
    const normActualParamVal = safeParseValue(actualParamVal);
    const normExpectedParamVal = safeParseValue(expectedParamVal);
    const passed = compareValues(normActualParamVal, normExpectedParamVal, { ordering, floatTolerance });
    const paramLabel = String(targetParam || 'nums');
    const actualFormatted = `${paramLabel} = ${formatVal(normActualParamVal)}`;
    const expectedFormatted = `${paramLabel} = ${formatVal(normExpectedParamVal ?? parsedExp.raw)}`;

    return {
      passed,
      actualFormatted,
      expectedFormatted,
      mismatchInfo: passed ? undefined : `Mutated ${paramLabel} mismatch: expected ${expectedFormatted}, got ${actualFormatted}`,
    };
  }

  // Case 3: Return Value AND Mutated Parameter (e.g. Remove Element, Remove Duplicates)
  if (type === 'return_and_mutation') {
    const actualReturn = safeParseValue(captured.returnValue);
    const expectedReturn = safeParseValue(parsedExp.expectedReturn);

    // Validate return integer k first
    const returnPassed = compareValues(actualReturn, expectedReturn, { floatTolerance });

    // Relevant slice length (first k elements)
    const sliceLen = typeof actualReturn === 'number' && actualReturn >= 0
      ? actualReturn
      : typeof expectedReturn === 'number' && expectedReturn >= 0
      ? expectedReturn
      : undefined;

    const normActualParamVal = safeParseValue(actualParamVal);
    const normExpectedParamVal = safeParseValue(expectedParamVal);

    // Validate first k elements of mutated parameter
    const mutationPassed = compareValues(normActualParamVal, normExpectedParamVal, {
      ordering,
      floatTolerance,
      length: sliceLen,
    });

    const passed = returnPassed && mutationPassed;

    const paramLabel = String(targetParam || 'nums');
    const slicedActual = Array.isArray(normActualParamVal) && typeof sliceLen === 'number'
      ? normActualParamVal.slice(0, sliceLen)
      : normActualParamVal;
    const slicedExpected = Array.isArray(normExpectedParamVal) && typeof sliceLen === 'number'
      ? normExpectedParamVal.slice(0, sliceLen)
      : normExpectedParamVal;

    const actualFormatted = `k = ${formatVal(actualReturn)}, ${paramLabel} = ${formatVal(slicedActual)}`;
    const expectedFormatted = `k = ${formatVal(expectedReturn)}, ${paramLabel} = ${formatVal(slicedExpected)}`;

    let mismatchInfo: string | undefined = undefined;
    if (!passed) {
      if (!returnPassed) {
        mismatchInfo = `Returned k = ${formatVal(actualReturn)} (expected k = ${formatVal(expectedReturn)})`;
      } else {
        mismatchInfo = `First ${sliceLen} elements of ${paramLabel} mismatch: expected ${formatVal(slicedExpected)}, got ${formatVal(slicedActual)}`;
      }
    }

    return {
      passed,
      actualFormatted,
      expectedFormatted,
      mismatchInfo,
    };
  }

  // Fallback default validation
  const passed = compareValues(captured.returnValue, parsedExp.expectedReturn, { ordering, floatTolerance });
  return {
    passed,
    actualFormatted: formatVal(captured.returnValue),
    expectedFormatted: formatVal(parsedExp.expectedReturn ?? parsedExp.raw),
    mismatchInfo: passed ? undefined : `Expected ${formatVal(parsedExp.expectedReturn)}, got ${formatVal(captured.returnValue)}`,
  };
}

function formatVal(v: any): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
