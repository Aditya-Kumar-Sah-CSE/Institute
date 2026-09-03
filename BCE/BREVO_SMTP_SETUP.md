# Brevo SMTP + Supabase Auth Setup Guide

This guide explains how to configure **Brevo SMTP** (formerly Sendinblue) with **Supabase Auth** for **Smart Learn**.

---

## Architecture Overview

```text
Smart Learn Application
          ↓
  Supabase Auth API
          ↓
  Brevo SMTP Relay (smtp-relay.brevo.com)
          ↓
      User Inbox
```

* **Supabase Auth** manages: Verification tokens, confirmation links, link expiration, and token validation.
* **Brevo SMTP** handles: Transactional email delivery.
* **Smart Learn App** handles: Verification UI (`/verify-email`), safe resend server action with rate limiting, and 60s UI cooldown.

---

## Step 1: Obtain Brevo SMTP Credentials

1. Log into your [Brevo Account](https://app.brevo.com/).
2. Navigate to **Transactional** → **Settings** (or click your account name in top-right → **SMTP & API**).
3. Under the **SMTP** tab, locate your SMTP details:
   - **SMTP Server / Host:** `smtp-relay.brevo.com`
   - **Port:** `587` (or `465` for SSL/TLS)
   - **Login / Username:** `<YOUR_BREVO_ACCOUNT_EMAIL>`
   - **SMTP Key / Password:** `<YOUR_BREVO_SMTP_KEY>` *(Click "Generate a new SMTP key" if needed)*

> [!IMPORTANT]
> **Domain Authentication:** In Brevo, go to **Senders & IPs** → **Domains** and verify your domain (add SPF, DKIM, and DMARC DNS records). This ensures maximum email deliverability to user inbox/primary tabs instead of spam.

---

## Step 2: Configure Custom SMTP in Supabase

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your Smart Learn project.
3. Go to **Project Settings** → **Authentication** → **SMTP Settings** (or **Auth** → **Providers** → **Email** → **SMTP Settings**).
4. Turn **ON** `Enable Custom SMTP`.
5. Enter the Brevo SMTP details:

| Field | Setting |
| :--- | :--- |
| **Sender Email** | `noreply@yourdomain.com` *(must match a verified sender/domain in Brevo)* |
| **Sender Name** | `Smart Learn` |
| **Host** | `smtp-relay.brevo.com` |
| **Port** | `587` *(TLS)* |
| **Minimum Transport Security** | `STARTTLS` or `TLS` |
| **Username** | `<YOUR_BREVO_SMTP_LOGIN>` |
| **Password** | `<YOUR_BREVO_SMTP_KEY>` |

6. Click **Save**.
7. Click **Send test email** to verify Supabase successfully connects to Brevo SMTP and delivers the email.

---

## Step 3: Configure Redirect URLs in Supabase

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**.
2. Set **Site URL** to your application domain:
   - Local Development: `http://localhost:3002` (or your local dev port)
   - Production: `https://your-domain.com`
3. Under **Redirect URLs**, add:
   - `http://localhost:3002/**`
   - `https://your-domain.com/**`
   - `https://your-domain.com/api/auth/callback`

---

## Step 4: Verify Confirmation Email Template

1. In Supabase Dashboard, go to **Authentication** → **Email Templates**.
2. Select **Confirm Signup**.
3. Ensure the message contains `{{ .ConfirmationURL }}`.
   Example template snippet:
   ```html
   <h2>Welcome to Smart Learn!</h2>
   <p>Please confirm your email address by clicking the link below:</p>
   <p><a href="{{ .ConfirmationURL }}">Verify Email Address</a></p>
   <p>If you did not sign up for Smart Learn, you can safely ignore this email.</p>
   ```

---

## Security & Quota Notes

* **Brevo Free Plan Limit:** 300 emails/day.
* **Smart Learn Rate Limiting:**
  - Per-email cooldown: 1 request / 60 seconds.
  - Per-email hourly limit: 5 requests / hour.
  - Global daily ceiling: 250 requests / day (reserving 50 emails/day for password resets).
* **Credentials Security:** SMTP credentials belong in Supabase Dashboard only. Never expose Brevo credentials in Next.js `.env` or `NEXT_PUBLIC_*` client bundles.
