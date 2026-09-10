# Computer Control Boundary

The companion is intentionally split from the Next.js web client:

- `local-computer-controller.ts`: server-only bridge; the browser never sees the token.
- `companion.js`: loopback transport, request authentication, allowlists, workspace boundary, and audit logging.
- Existing `live-dom-reader` and `interactWithPageElement`: browser-page inspection and DOM actions remain in the web app.
- Existing `agent-autonomous-loop`: perception, planning, confirmation, execution, observation, and verification for registered Smart Agent tools.

Future native adapters must be separate, explicitly enabled modules:

- `ScreenReader`: OS capture/OCR with user-visible permission and redaction.
- `WindowManager`: allowlisted process/window identifiers only.
- `InputController`: coordinate and keyboard actions with confirmation for sensitive fields.
- `BrowserController`: Playwright/CDP session tied to a paired browser profile.
- `AppController`: signed allowlisted application adapters, never arbitrary shell commands.
- `ActionVerifier`: post-action observation and expected-state checks before the next action.
- `PermissionManager`: per-action scope, expiry, confirmation, and audit decision.

No adapter may accept arbitrary JavaScript, arbitrary shell text, unrestricted paths, or silent destructive actions.
