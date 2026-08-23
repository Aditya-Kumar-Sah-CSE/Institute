# Google Drive OAuth configuration

This app has a dedicated Drive connection callback; it is separate from the Supabase Google login callback.

Configure the same Google OAuth client in every environment with the Drive API enabled and this exact authorised redirect URI:

- Local: `http://localhost:3000/api/auth/google-drive/callback`
- Production: `https://<production-domain>/api/auth/google-drive/callback`

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in the matching local/Vercel environment. `GOOGLE_REDIRECT_URI` must exactly match the current environment's authorised URI, including scheme, domain, and path. Do not reuse the local URI in Vercel. Redeploy after changing Vercel environment variables.

The callback writes structured server logs prefixed with `[google-drive/callback]` and a trace ID. The trace ID is safe to share for debugging; OAuth codes and tokens are not logged.
