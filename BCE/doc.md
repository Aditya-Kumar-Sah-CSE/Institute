# BCE Institute - Project Cloning & Setup Guide

This document provides a detailed, step-by-step walkthrough on how to clone the existing Institute codebase for the **BCE Institute**. This instance will have its own isolated database (Supabase), its own emails, and its own custom domain.

---

## Step 1: Local Setup & Cloning
First, you need to pull the code to your new local directory for BCE Institute.

1. Open your terminal or command prompt.
2. Clone the existing GitHub repository into the `BCE` folder:
   ```bash
   cd D:\Institute
   git clone https://github.com/Aditya-Kumar-Sah-CSE/Institute.git BCE
   ```
3. Navigate into the new directory and install the required dependencies:
   ```bash
   cd BCE
   npm install
   ```

---

## Step 2: Supabase (Database & Auth) Setup
You need a fresh database for BCE Institute so its data does not mix with other institutes.

1. Go to the [Supabase Dashboard](https://supabase.com/dashboard) and click **New Project**.
2. Name it "BCE Institute" and create a strong database password. **Save this password**.
3. Wait for the project to provision.
4. Go to **Project Settings -> API** and copy the `Project URL`, `anon public key`, and `service_role key`.
5. In your local `BCE` folder, create a new file named `.env.local`.
6. Add the **new** Supabase credentials based on your previous `.env` file structure:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<NEW_PROJECT_REF>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<NEW_ANON_KEY>
   SUPABASE_SERVICE_ROLE_KEY=<NEW_SERVICE_ROLE_KEY>
   DATABASE_URL=postgresql://postgres:<NEW_PASSWORD>@db.<NEW_PROJECT_REF>.supabase.co:5432/postgres
   
   # Change port if 3000/3001/3002 is occupied
   NEXT_PUBLIC_SITE_URL=http://localhost:3003 
   
   # Institute Branding
   NEXT_PUBLIC_INSTITUTE_NAME="BCE Institute"
   ```

### 2.1 Migrate the Database Schema
You need to create all the tables in the new database.
1. Run your existing migration scripts against the new database:
   ```bash
   node run_migration.js
   ```
   *(Ensure that this script creates all the necessary tables and Row-Level Security policies).*

---

## Step 3: SMTP (Email) Setup
BCE Institute will need its own email setup for authentication emails (like Forget Password). You can use Resend or a Gmail App Password.

### Option A: Using Principal's Gmail (App Password)
1. Log into the Principal's Gmail account.
2. Go to [myaccount.google.com/security](https://myaccount.google.com/security) and ensure **2-Step Verification** is turned ON.
3. Search for **"App passwords"**, select app: Choose **'Other'** (or 'Custom') and type **"Supabase BCE Institute"**.
4. Click **"Generate"** and copy the **16-character password**.
5. In your BCE Institute Supabase project, go to **Project Settings -> Authentication -> SMTP**.
6. Turn ON **"Enable Custom SMTP"** and fill in:
   - **Host:** `smtp.gmail.com`
   - **Port:** `465` (or `587`)
   - **User:** `<Principal's Gmail Address>`
   - **Password:** `<The 16-character App Password>`
   - **Sender email:** `<Principal's Gmail Address>`
   - **Sender name:** `BCE Institute Admin`
7. Click **Save** and test.

### Option B: Using Resend
1. Go to [Resend.com](https://resend.com).
2. Go to **API Keys** and create a new key named "BCE Institute Supabase".
3. In Supabase -> Authentication -> SMTP Settings, enable Custom SMTP:
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **Username:** `resend`
   - **Password:** `<Your Resend API Key>`
   - **Sender email:** `onboarding@resend.dev` (or custom verified domain)
   - **Sender name:** `BCE Institute`

---

## Step 4: Authentication (Disable Email Confirmation) & Forget Password Setup
1. In Supabase, go to **Authentication -> Providers -> Email**.
2. Turn **OFF "Confirm email"** (since you do not want email confirmation for new signups).
3. Ensure **"Enable Email provider"** and **"Enable secure password recovery"** are turned **ON** (so Forget Password still works).
4. Go to **Authentication -> URL Configuration**.
5. Set the **Site URL** to your local testing URL (e.g., `http://localhost:3003`). When deploying, change this to the live BCE Institute domain.
6. Under **Redirect URLs**, add `http://localhost:3003/**` (and the live domain later).
7. Go to **Authentication -> Email Templates**.
8. Select the **Reset Password** template.
9. Ensure the template contains `{{ .ConfirmationURL }}`.
   > "Hello, please click the link below to reset your password for BCE Institute: {{ .ConfirmationURL }}"
10. Save the template.

---

## Step 5: Code Changes (Branding & Hardcoded Text)
Since you are using the *exact same codebase*, replace hardcoded text with Environment Variables.

1. Search your codebase for hardcoded text (like titles, logos).
2. Replace them with variables like `process.env.NEXT_PUBLIC_INSTITUTE_NAME`.
3. Commit these changes and push to GitHub:
   ```bash
   git add .
   git commit -m "feat: make institute name dynamic via env variable for BCE"
   git push
   ```

---


## Step 6: Vercel Deployment
When you are ready to put BCE Institute live:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New -> Project**.
2. Select your existing GitHub repository (`Aditya-Kumar-Sah-CSE/Institute`).
3. Expand **Environment Variables** and add all the variables from your BCE `.env.local` file.
4. Click **Deploy**.
5. Update your Supabase Auth **Site URL** and **Redirect URLs** (from Step 4) to match the newly generated Vercel domain.
