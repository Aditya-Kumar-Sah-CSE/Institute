export type PlatformName = 'CODEFORCES' | 'LEETCODE';

export interface PlatformProblemIdentifier {
  platform: PlatformName;
  contestId?: string; // Codeforces contestId (e.g., "4")
  problemIndex?: string; // Codeforces problemIndex (e.g., "A")
  slug?: string; // LeetCode title slug (e.g., "two-sum")
  rawInput: string;
}

export interface ExternalExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface ExternalProblem {
  platform: PlatformName;
  externalId: string; // e.g., "4A" or "two-sum"
  slug: string;
  title: string;
  statement: string;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  examples: ExternalExample[];
  explanation?: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  rating?: number | null;
  tags: string[];
  officialUrl: string;
  starterCode: Record<string, string>;
  signature?: any;
  hints?: string[];
  followUp?: string;
  isPremium?: boolean;
  metadata?: any;
}

export interface CodingPlatformAdapter {
  platform: PlatformName;
  parseIdentifier(input: string): PlatformProblemIdentifier | null;
  fetchProblem(identifier: PlatformProblemIdentifier): Promise<ExternalProblem>;
}
