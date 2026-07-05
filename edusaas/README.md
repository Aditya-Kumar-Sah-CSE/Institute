# EduSaaS: Multi-Tenant Institute Platform

This is the multi-tenant version of the Institute Management Platform, designed to host 25+ isolated colleges from a single Next.js monorepo.

## Architecture Highlights
- **Multi-Tenancy Model**: Shared Database, Separate Schemas (PostgreSQL). Every institute gets a dedicated schema (e.g., `tenant_bce`, `tenant_mit`) within the same PostgreSQL instance.
- **Routing**: Tenant resolution via path (`/institute1/dashboard`) or wildcard subdomains via `middleware.ts`.
- **Framework**: Next.js 15 App Router.
- **ORM**: Drizzle ORM (dynamically switches `search_path` per tenant request).
- **Authentication**: NextAuth v5 configured securely with a dynamic tenant credentials provider.
- **Billing**: Stripe Checkout and Webhooks (auto-suspension on failure).

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env.local` and fill in your Supabase connection string and NextAuth credentials.

3. **Master Database Setup**
   The platform needs a master schema to store registered tenants.
   ```bash
   # Make sure your drizzle config points to master schema URL
   npx drizzle-kit push
   ```

4. **Run Locally**
   ```bash
   npm run dev
   ```

## Tenant Provisioning
As a Super Admin (`iambestadi@gmail.com`), navigate to `/admin/institutes/new`. 
Creating a new tenant automatically generates their isolated PostgreSQL schema, runs the 25+ table migrations exactly as defined in `tenant-schema.ts`, and emails them the admin credentials.

## Deployment on Vercel
1. Link your GitHub repository to Vercel.
2. In Vercel Project Settings > General, ensure Framework Preset is Next.js.
3. In Vercel Project Settings > Environment Variables, copy your `.env.local` values.
4. **Wildcard Domains:** If using subdomains (e.g., `bce.edusaas.com`), add `*.edusaas.com` to your Vercel domains and configure the CNAME in your DNS provider. 
5. Deploy!
