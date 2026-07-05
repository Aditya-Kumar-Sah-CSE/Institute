import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getTenantBySlug } from '@/lib/tenant/resolver';
import { getTenantDb } from '@/lib/db/tenant';
import { profiles } from '@/lib/db/schema/tenant-schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantSlug: { label: "Tenant Slug", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenantSlug) {
          return null;
        }
        
        const email = credentials.email as string;
        const password = credentials.password as string;
        const tenantSlug = credentials.tenantSlug as string;

        // 1. Resolve tenant
        const tenant = await getTenantBySlug(tenantSlug);
        if (!tenant || tenant.status !== 'active') return null;
        
        // Mock NextAuth Login for UI Cloned Dashboard Testing
        return {
          id: 'user-mock-id',
          email: email,
          role: 'student',
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantSchema: tenant.schema_name,
        };
        
        // Cleanly mocked.
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.tenantSlug = (user as any).tenantSlug;
        token.tenantSchema = (user as any).tenantSchema;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).tenantSlug = token.tenantSlug;
      }
      return session;
    }
  }
});
