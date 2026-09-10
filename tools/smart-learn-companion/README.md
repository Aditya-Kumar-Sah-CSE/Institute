# Smart Learn Computer Companion

This is a local-only companion process. The Next.js client never receives OS credentials or unrestricted shell access. The web server calls this process over `127.0.0.1` with a shared token.

## Start

From `D:\Institute`:

```powershell
$env:SMART_LEARN_WORKSPACE = 'D:\Institute\BCE'
$env:SMART_LEARN_COMPANION_TOKEN = '<same-random-token-used-by-the-BCE-server>'
npm run companion
```

Set the same `SMART_LEARN_COMPANION_TOKEN` and `SMART_LEARN_COMPANION_URL=http://127.0.0.1:43127` in `BCE/.env.local`, then restart Next.js.

## Current safety boundary

- Binds to loopback only.
- Requires the shared token on every request.
- Launches only detected Chrome or Edge executables.
- Uses a fixed local Chrome DevTools Protocol port and an isolated browser profile for navigation.
- Verifies browser navigation using the active tab URL, title, ready state, and visible DOM text.
- Rejects browser extension, proxy, file, data, and JavaScript arguments.
- Restricts companion file access to `SMART_LEARN_WORKSPACE`.
- Requires an explicit confirmation header for app launch and file writes.
- Writes JSONL audit records to `.smart-learn/computer-audit.jsonl`.
- Does not expose arbitrary shell execution, screen capture, OCR, raw keyboard, or raw mouse input.

Those capabilities must be added as separately permissioned adapters with observe/verify implementations. They must never be implemented by evaluating browser JavaScript or by forwarding arbitrary commands from the web client.
