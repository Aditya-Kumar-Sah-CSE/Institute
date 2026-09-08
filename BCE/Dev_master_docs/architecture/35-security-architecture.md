# 35. Security Architecture & Threat Protection

STATUS: ✅ IMPLEMENTED

## Security Model Summary
- **BYOK Encryption**: AES-256-GCM authenticated encryption (`src/lib/security/encryption.ts`). Decryption happens strictly in server context.
- **Row Level Security**: 100+ RLS policies enforcing tenant and user boundaries.
- **Rate Limiting**: `src/lib/rate-limit.ts` preventing API abuse.
- **Input Sanitization**: Safe JSON stringification (`src/lib/ai/safe-stringify.ts`) preventing prompt injection attacks.
