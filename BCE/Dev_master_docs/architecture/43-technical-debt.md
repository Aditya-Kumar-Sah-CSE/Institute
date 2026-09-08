# 43. Technical Debt & Refactoring Roadmap

STATUS: 🟡 PARTIAL

## Refactoring Priorities
1. **Legacy Route Standardization**: Consolidate remaining direct Supabase client calls into feature Server Actions.
2. **Realtime Channel Cleanup**: Ensure all Supabase Realtime subscriptions explicitly unmount on page transitions to prevent memory leaks.
