import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";

const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS
  ? process.env.ALLOWED_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : null;

const hasGoogle =
  !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

if (process.env.NODE_ENV === "development") {
  console.log("[auth] Google sign-in:", hasGoogle ? "enabled" : "disabled (set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in .env)");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: "/api/auth",
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(hasGoogle
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          }),
        ]
      : []),
    // Always register so auth API never gets UnknownAction. Dev: any email + password "dev".
    Credentials({
      name: "Dev login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.password !== "dev") return null;
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        if (!email) return null;
        const user = await prisma.user.upsert({
          where: { email },
          create: { email, name: email.split("@")[0] },
          update: {},
        });
        return { id: user.id, email: user.email!, name: user.name };
      },
    }),
  ],
  callbacks: {
    signIn({ user }) {
      if (!ALLOWED_EMAILS || ALLOWED_EMAILS.length === 0) return true;
      const email = user?.email?.toLowerCase();
      if (!email) return false;
      return ALLOWED_EMAILS.includes(email);
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  // JWT required when Credentials provider is used (so both Google and dev login work).
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
});
