import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getSession()
  
  if (!session || !session.user) {
    throw new Error('Unauthorized')
  }
  
  return session
}
