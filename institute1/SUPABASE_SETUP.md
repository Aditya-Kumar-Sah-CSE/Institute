# Supabase Authentication Setup Guide

This guide explains how to properly configure Supabase to handle authentication flows, specifically for the **Forgot Password** and **Email Reset** functionality.

## Step 1: URL Configuration
Supabase needs to know your website's URL so it can redirect users back to your application after they click links in authentication emails.

1. Log in to your **[Supabase Dashboard](https://supabase.com/dashboard)** and select your project.
2. In the left sidebar menu, click on **Authentication**.
3. Under the Configuration section, select **URL Configuration**.
4. Set your **Site URL**:
   - For local development: `http://localhost:3002`
   - For production: `https://institute1-one.vercel.app`
5. Scroll down to the **Redirect URLs** section. Click **Add URL** and add the following (if not already present):
   - `http://localhost:3002/**` (Allows redirects to any path on your local dev server, including your `/api/auth/callback` route)
   - `https://institute1-one.vercel.app/**` (Allows redirects to any path on your live Vercel application)

## Step 2: Email Templates Configuration
When a user requests a password reset, Supabase sends an email based on a predefined template.

1. In the **Authentication** menu, click on **Email Templates**.
2. Go to the **Reset Password** tab.
3. Verify that the message body includes the `{{ .ConfirmationURL }}` variable in the link. This variable is automatically replaced by Supabase with a secure, one-time link.
   
   Your template should look something like this:
   ```html
   <h2>Reset Password</h2>
   <p>Follow this link to reset the password for your user:</p>
   <p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
   ```
   *(Note: The code in your application sets a `redirectTo` parameter, so the `{{ .ConfirmationURL }}` will automatically point to your application's `/api/auth/callback` route, passing along the required secure tokens.)*

## Step 3: SMTP Provider (Important for Production)
By default, Supabase provides a built-in email server for testing. However, it has strict rate limits (typically 3-4 emails per hour) and may experience delays.

- **Local Testing:** You can rely on the default server, but if you stop receiving emails, you have likely hit the rate limit. Wait a bit and try again.
- **Going Live (Production):** You must configure a custom SMTP server.
  1. Go to **Project Settings** (the gear icon) -> **Authentication** -> **SMTP Settings**.
  2. Enter the details of an email provider (such as Resend, SendGrid, Amazon SES, or Brevo) to ensure reliable and unlimited email delivery to your users.

---
**Done!** Your password reset flow is now fully configured on the Supabase side.
