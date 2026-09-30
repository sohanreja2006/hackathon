import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],

  // Use JWT strategy — no database required
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours, matches SIWE session TTL
  },

  // Custom sign-in page
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },

  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist Google profile data in the JWT on first sign-in
      if (account?.provider === "google" && profile) {
        token.provider = "google";
        token.googleId = profile.sub;
      }
      return token;
    },

    async session({ session, token }) {
      // Expose provider info to the client session
      if (session.user) {
        (session.user as Record<string, unknown>).provider = token.provider;
        (session.user as Record<string, unknown>).googleId = token.googleId;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // After sign-in redirect to dashboard
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return `${baseUrl}/dashboard`;
    },
  },

  secret: process.env.NEXTAUTH_SECRET ?? "cyber10-nextauth-secret-development-only",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
