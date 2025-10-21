import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only allow specific emails to sign in (your admin emails)
      const allowedEmails = process.env.ADMIN_EMAILS?.split(',') || []
      
      if (user.email && allowedEmails.includes(user.email)) {
        return true
      }
      
      return false // Reject sign in if not in allowed list
    },
    async session({ session, token }) {
      // Add user id to session
      if (session.user) {
        session.user.id = token.sub!
      }
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
