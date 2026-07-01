# BCE BGP College - Project Cloning & Setup Guide

This document provides a detailed, step-by-step walkthrough on how to clone the existing Institute codebase for the **BCE BGP College**. This instance will have its own isolated database and use the College Principal's Gmail for sending emails (including "Forget Password" links).

---

## Step 1: Local Setup & Cloning
First, pull the code to your new local directory for BCE BGP.

1. Open your terminal or command prompt.
2. Clone the existing GitHub repository into the `bce_bgp` folder:
   ```bash
   cd D:\Institute
   git clone https://github.com/Aditya-Kumar-Sah-CSE/Institute.git bce_bgp
   ```
3. Navigate into the new directory and install the required dependencies:
   ```bash
   cd bce_bgp
   npm install
   ```

---

## Step 2: Supabase (Database & Auth) Setup
You need a fresh database for BCE BGP so its data does not mix with other institutes.

1. Go to the [Supabase Dashboard](https://supabase.com/dashboard) and click **New Project**.
2. Name it "BCE BGP" and create a strong database password. **Save this password**.
3. Wait for the project to provision.
4. Go to **Project Settings -> API** and copy the `Project URL`, `anon public key`, and `service_role key`.
5. In your local `bce_bgp` folder, create a new file named `.env.local`.
6. Add the **new** Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<NEW_PROJECT_REF>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<NEW_ANON_KEY>
   SUPABASE_SERVICE_ROLE_KEY=<NEW_SERVICE_ROLE_KEY>
   DATABASE_URL=postgresql://postgres:<NEW_PASSWORD>@db.<NEW_PROJECT_REF>.supabase.co:5432/postgres
   
   # Change port if 3000/3001/3002 is occupied
   NEXT_PUBLIC_SITE_URL=http://localhost:3003 
   
   # Institute Branding
   NEXT_PUBLIC_INSTITUTE_NAME="BCE BGP College"
   ```

### 2.1 Migrate the Database Schema
You need to create all the tables in the new database.
1. Run your existing migration scripts against the new database:
   ```bash
   node run_migration.js
   ```
   *(Ensure that this script creates all the necessary tables and Row-Level Security policies).*

---

## Step 3: Principal's Gmail SMTP Setup
BCE BGP will use the College Principal's Gmail to send authentication emails. You must generate an **App Password** for this.

### 3.1 Generate App Password (in Gmail)
1. Log into the Principal's Gmail account.
2. Go to [myaccount.google.com/security](https://myaccount.google.com/security).
3. Ensure **2-Step Verification** is turned ON.
4. Search for **"App passwords"** (usually at the bottom of the 2-Step Verification page).
5. Select app: Choose **'Other'** (or 'Custom') and type **"Supabase BCE BGP"**.
6. Click **"Generate"**.
7. Copy the **16-character password** (save it somewhere safe, you won't see it again).

### 3.2 Configure SMTP in Supabase
1. In your BCE BGP Supabase project, go to **Project Settings -> Authentication -> SMTP**.
2. Turn ON **"Enable Custom SMTP"**.
3. Fill in the details:
   - **Host:** `smtp.gmail.com`
   - **Port:** `465` (or `587`)
   - **User:** `<Principal's Gmail Address>`
   - **Password:** `<The 16-character App Password>` (no spaces)
   - **Sender email:** `<Principal's Gmail Address>`
   - **Sender name:** `BCE BGP Admin`
4. Click **Save** and use the **"Send test email"** button at the bottom to verify it works.

---

## Step 4: Authentication & Forget Password Setup
To ensure users can securely sign up and reset their passwords:

1. In Supabase, go to **Authentication -> URL Configuration**.
2. Set the **Site URL** to your local testing URL (e.g., `http://localhost:3003`). When deploying, change this to the live BCE BGP domain.
3. Under **Redirect URLs**, add `http://localhost:3003/**` (and the live domain later).
4. Go to **Authentication -> Email Templates**.
5. Select the **Reset Password** template.
6. Ensure the template contains `{{ .ConfirmationURL }}`. You can customize the message to say:
   > "Hello, please click the link below to reset your password for BCE BGP College: {{ .ConfirmationURL }}"
7. Save the template.

---

## Step 5: Vercel Deployment
When you are ready to put BCE BGP College live:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New -> Project**.
2. Select your existing GitHub repository (`Aditya-Kumar-Sah-CSE/Institute`).
3. Expand **Environment Variables** and add all the variables from your `bce_bgp` `.env.local` file.
4. Click **Deploy**.
5. Update your Supabase Auth **Site URL** and **Redirect URLs** (from Step 4) to match the newly generated Vercel domain.
