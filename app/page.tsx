'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function Home() {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">⚡ Neighs of Thunder</h1>
        <p className="text-xl text-gray-400 mb-8">Horse Racing Autobattler</p>

        {isLoading ? (
          <div className="text-gray-500">Loading...</div>
        ) : session ? (
          <div className="space-y-4">
            <p className="text-green-400">Welcome back, {session.user.username}!</p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/game"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition"
              >
                Play Now
              </Link>
              <Link
                href="/tutorial"
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition"
              >
                How to Play
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition"
            >
              Create Account
            </Link>
            <Link
              href="/tutorial"
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition"
            >
              How to Play
            </Link>
          </div>
        )}

        <div className="mt-12 text-sm text-gray-500">
          <p>Multiplayer browser-based horse racing game</p>
          <p className="mt-2">Draft horses, train your stable, place bets, and win!</p>
        </div>
      </div>
    </main>
  )
}
