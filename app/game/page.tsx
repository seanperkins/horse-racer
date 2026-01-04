import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth'
import GamePageClient from './GamePageClient'

const { auth } = NextAuth(authConfig)

async function GamePageContent() {
  // Check authentication
  const session = await auth()

  if (!session || !session.user) {
    redirect('/login')
  }

  return (
    <GamePageClient
      userId={session.user.id!}
      username={session.user.username!}
    />
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center th-bg text-white">
        <div className="text-xl">Loading...</div>
      </div>
    }>
      <GamePageContent />
    </Suspense>
  )
}
