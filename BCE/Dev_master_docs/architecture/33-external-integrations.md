# 33. External Coding Platform Integrations

STATUS: ✅ IMPLEMENTED

## Subsystem Architecture
Syncs student performance data from external competitive programming platforms living in `src/lib/coding-platforms/`.

## Supported Platforms
- **Codeforces**: `codeforces.ts` (User info, contest rating history, problem submissions)
- **LeetCode**: `leetcode.ts` (Solved counts by difficulty, submission calendar)
- **CodeChef**: `codechef.ts` (Current rating, global rank)
- **GeeksforGeeks**: `geeksforgeeks.ts` (Coding score, total solved)
