import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

const authOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      const allowlist =
        process.env.ADMIN_EMAIL_ALLOWLIST?.split(',').map((e) => e.trim().toLowerCase()) || [];
      return allowlist.includes(user.email.toLowerCase());
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt' as const,
  },
} satisfies NextAuthConfig;

export const { auth, handlers } = NextAuth(authOptions);
