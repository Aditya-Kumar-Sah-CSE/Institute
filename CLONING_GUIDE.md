# Guide to Cloning the Institute App for a New Institute (e.g., ABC Institute)

This document provides a detailed, step-by-step walkthrough on how to take your existing codebase from GitHub and deploy a completely separate instance of the app for a new institute. 

> [!NOTE]
> Even though you are using the **same GitHub repository**, the new institute will have its own isolated database (Supabase), its own emails (Resend), and its own custom domain.

---

## Step 1: Local Setup & Cloning
First, you need to pull the code to your new local directory (`D:\Institute\institute2`).

1. Open your terminal or command prompt.
2. Clone your existing GitHub repository into the new folder:
   ```bash
   cd D:\Institute
   git clone https://github.com/Aditya-Kumar-Sah-CSE/Institute.git institute2
   ```
3. Navigate into the new directory and install the dependencies:
   ```bash
   cd institute2
   npm install
   ```

---

## Step 2: Supabase (Database & Auth) Setup
You need a fresh database for ABC Institute so their data does not mix with Institute 1.

1. Go to the [Supabase Dashboard](https://supabase.com/dashboard) and click **New Project**.
2. Name it "ABC Institute" (or similar), and create a strong database password. Save this password.
3. Wait for the project to provision.
4. Go to **Project Settings -> API** and copy the `Project URL` and `anon public key`.
5. In your local `institute2` folder, create a new file named `.env.local`.
6. Copy the structure from your previous `.env` file, but use the **new** Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<NEW_PROJECT_REF>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<NEW_ANON_KEY>
   SUPABASE_SERVICE_ROLE_KEY=<NEW_SERVICE_ROLE_KEY>
   DATABASE_URL=postgresql://postgres:<NEW_PASSWORD>@db.<NEW_PROJECT_REF>.supabase.co:5432/postgres
   NEXT_PUBLIC_SITE_URL=http://localhost:3002
   ```

### 2.1 Migrate the Database Schema
Now you need to create all the tables (Profiles, Courses, etc.) in the new database.
1. Run your existing migration scripts against the new database:
   ```bash
   node run_migration.js
   ```
   *(Ensure that this script creates all the necessary tables and Row-Level Security policies as it did for Institute 1).*

### 2.2 Configure Authentication Settings
1. In Supabase, go to **Authentication -> URL Configuration**.
2. Set the **Site URL** to `http://localhost:3002` (for local testing). When deploying, change this to the live ABC Institute domain (e.g., `https://abcinstitute.com`).
3. Under **Redirect URLs**, add `http://localhost:3002/**` and `https://abcinstitute.com/**`.
4. Go to **Authentication -> Email Templates**. Ensure the Reset Password template contains `{{ .ConfirmationURL }}`.

---

## Step 3: Resend (Email SMTP) Setup
To ensure ABC Institute sends its own password reset emails (with its own name):

1. Go to [Resend.com](https://resend.com) (you can use your existing account).
2. Go to **API Keys** and create a new key named "ABC Institute Supabase". Copy the key.
3. Go back to your new **Supabase Project -> Authentication -> SMTP Settings**.
4. Enable Custom SMTP and fill in:
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **Username:** `resend`
   - **Password:** `<Your New Resend API Key>`
   - **Sender email:** `onboarding@resend.dev` (or a custom verified domain for ABC Institute, e.g., `info@abcinstitute.com`).
   - **Sender name:** `ABC Institute`

---

## Step 4: Code Changes (Branding & Hardcoded Text)
Since you are using the *exact same codebase*, any place where you typed "Smart Hybrid Learning" or "Institute 1" will show up for ABC Institute. 

To fix this properly without creating two separate repositories:
1. Search your codebase for hardcoded text (like titles, logos, email addresses).
2. Replace them with Environment Variables. For example, add this to your `.env.local`:
   ```env
   NEXT_PUBLIC_INSTITUTE_NAME="ABC Institute"
   ```
3. In your React components (like `Navbar.tsx` or `layout.tsx`), use it:
   ```tsx
   <h1>{process.env.NEXT_PUBLIC_INSTITUTE_NAME || 'Default Institute'}</h1>
   ```
4. Commit these changes and push to GitHub:
   ```bash
   git add .
   git commit -m "feat: make institute name dynamic via env variable"
   git push
   ```
*(This way, the single GitHub repo adapts its branding based on which Vercel project it's running in).*

---

## Step 5: Vercel Deployment
Finally, deploy the clone for ABC Institute:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New -> Project**.
2. Select your **same existing GitHub repository** (`Aditya-Kumar-Sah-CSE/Institute`).
3. Leave the framework preset as Next.js.
4. **Crucial Step:** Expand the **Environment Variables** section. Add all the variables from your ABC Institute `.env.local` file (the new Supabase URL, Anon Key, Database URL, and the new `NEXT_PUBLIC_INSTITUTE_NAME`).
5. Click **Deploy**.
6. Once deployed, go to the Vercel Project Settings -> **Domains** and link ABC Institute's custom domain (e.g., `abcinstitute.com`).
7. Update your Supabase Auth **Site URL** and **Redirect URLs** (from Step 2.2) to match this new live domain.

> [!TIP]
> From now on, whenever you `git push` to `main`, **both** Institute 1 and ABC Institute will receive the code updates automatically! But their databases and users will remain completely separate.
