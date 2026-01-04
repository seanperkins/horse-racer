'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useGameStore } from '@/lib/store/gameStore'
import { useAudioStore } from '@/lib/store/audioStore'
import type { ClientMessage } from '@/types/messages'

interface BettingPhaseProps {
  sendMessage: (message: ClientMessage) => void
}

interface BettingEntry {
  playerId: string
  playerName: string
  horse: any
  jockey: any
  equipment: any
  strategy: any
  odds: number
  placeOdds: number
  winProbability: number
}

export function BettingPhase({ sendMessage }: BettingPhaseProps) {
  const { gold, hearts, currentRound, bettingEntries, playerId, bettingStatus, setBettingStatus } = useGameStore()
  const playSfx = useAudioStore((state) => state.playSfx)

  const [betType, setBetType] = useState<'win' | 'place' | 'exacta'>('win')
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [exactaFirst, setExactaFirst] = useState<string | null>(null)
  const [exactaSecond, setExactaSecond] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState<number>(3)
  const [betForHeart, setBetForHeart] = useState<boolean>(false)

  // Use store's bettingStatus instead of local state
  const betPlaced = bettingStatus !== 'open'

  const entries = bettingEntries as BettingEntry[]
  const maxBet = Math.min(10, gold)
  const canBetForHeart = hearts < 5 && gold >= 5

  const handlePlaceBet = () => {
    if (betPlaced) {
      toast.error('You have already placed a bet this round!')
      return
    }

    if (betAmount < 1 || betAmount > maxBet) {
      toast.error(`Bet must be between 1 and ${maxBet} gold`)
      return
    }

    if (betForHeart && betAmount < 5) {
      toast.error('Recovery bet requires minimum 5 gold')
      return
    }

    if (betForHeart && betType !== 'exacta') {
      toast.error('Recovery bet requires Exacta bet type')
      return
    }

    if (betType === 'win' || betType === 'place') {
      if (!selectedPlayer) {
        toast.error('Please select a player to bet on')
        return
      }
      if (selectedPlayer === playerId) {
        toast.error('Cannot bet on your own horse!')
        return
      }

      sendMessage({
        type: 'place_bet',
        betType,
        targetPlayerId: selectedPlayer,
        amount: betAmount,
        betForHeart,
      })
    } else if (betType === 'exacta') {
      if (!exactaFirst || !exactaSecond) {
        toast.error('Please select both 1st and 2nd place for Exacta bet')
        return
      }
      if (exactaFirst === exactaSecond) {
        toast.error('Cannot select the same player for 1st and 2nd')
        return
      }
      if (exactaFirst === playerId || exactaSecond === playerId) {
        toast.error('Cannot bet on your own horse!')
        return
      }

      sendMessage({
        type: 'place_bet',
        betType: 'exacta',
        exactaFirst,
        exactaSecond,
        amount: betAmount,
        betForHeart,
      })
    }

    playSfx('bet_place')
    setBettingStatus('submitted')
  }

  const handleSkip = () => {
    setBettingStatus('skipped')
  }

  const getSelectedEntry = () => {
    return entries.find((e) => e.playerId === selectedPlayer)
  }

  // Calculate Prestige earned: 1 Prestige per ~2.5 gold wagered on win
  const getPotentialPrestige = () => {
    // Prestige is based on bet amount, not odds
    // 1 Prestige per 2.5 gold wagered (minimum 1 if bet >= 1)
    if (betAmount < 1) return 0
    return Math.max(1, Math.floor(betAmount / 2.5))
  }

  return (
    <div className="min-h-screen p-4 md:p-8 th-bg">
      <div className="max-w-7xl mx-auto">
        {betPlaced ? (
          <div className="th-panel rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-[var(--accent-green)]">
              {bettingStatus === 'submitted' ? '✓ Bet Placed!' : '⏭ Betting Skipped'}
            </h2>
            <p className="th-label">Waiting for race to begin...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Bet Type Selection */}
            <div className="th-panel rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Bet Type</h2>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => {
                    setBetType('win')
                    setBetForHeart(false)
                  }}
                  className={`w-full p-4 rounded border-2 text-left transition ${
                    betType === 'win'
                      ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                      : 'border-[var(--border)] hover:border-[var(--accent-green)]/50'
                  }`}
                >
                  <div className="font-bold mb-1">Win Bet</div>
                  <div className="text-sm opacity-70">Pick the winner to earn ⭐ Prestige</div>
                </button>

                <button
                  onClick={() => {
                    setBetType('place')
                    setBetForHeart(false)
                  }}
                  className={`w-full p-4 rounded border-2 text-left transition ${
                    betType === 'place'
                      ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                      : 'border-[var(--border)] hover:border-[var(--accent-green)]/50'
                  }`}
                >
                  <div className="font-bold mb-1">Place Bet</div>
                  <div className="text-sm opacity-70">Pick top 3 finisher to earn ⭐ Prestige</div>
                </button>

                <button
                  onClick={() => setBetType('exacta')}
                  className={`w-full p-4 rounded border-2 text-left transition ${
                    betType === 'exacta'
                      ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                      : 'border-[var(--border)] hover:border-[var(--accent-green)]/50'
                  }`}
                >
                  <div className="font-bold mb-1">Exacta</div>
                  <div className="text-sm opacity-70">Pick 1st AND 2nd in order to earn ⭐ Prestige</div>
                </button>
              </div>

              {/* Bet Amount */}
              <div className="mb-6">
                <label className="block font-semibold mb-2">Bet Amount</label>
                <input
                  type="range"
                  min="1"
                  max={maxBet}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm mt-2">
                  <span>1g</span>
                  <span className="font-bold text-lg">{betAmount}g</span>
                  <span>{maxBet}g (max)</span>
                </div>
              </div>

              {/* Recovery Bet Option */}
              {canBetForHeart && betType === 'exacta' && (
                <div className="p-4 bg-[var(--accent-orange)]/20 rounded border-2 border-[var(--accent-orange)]">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={betForHeart}
                      onChange={(e) => setBetForHeart(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <div>
                      <div className="font-bold">Recovery Bet</div>
                      <div className="text-xs opacity-80">
                        Win: Recover 1 heart (lose gold)
                        <br />
                        Lose: Lose gold only
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* Potential Reward */}
              <div className="mt-6 p-4 bg-[var(--bg-secondary)] rounded">
                <h4 className="font-semibold mb-2 text-sm">Potential Reward</h4>
                {betForHeart ? (
                  <div className="text-lg font-bold text-[var(--accent-red)]">+1 ❤️</div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">⭐</span>
                    <span className="text-lg font-bold text-[var(--accent-gold)]">
                      {getPotentialPrestige()} Prestige
                    </span>
                  </div>
                )}
                <div className="text-xs opacity-60 mt-2">
                  Betting costs gold but wins earn Prestige
                </div>
              </div>
            </div>

            {/* Middle Column - Race Entries */}
            <div className="lg:col-span-2 th-panel rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Race Entries</h2>

              {entries.length === 0 ? (
                <p className="text-center th-label py-8">Waiting for race entries...</p>
              ) : (
                <>
                  {betType === 'exacta' ? (
                    <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded">
                      <h3 className="font-semibold mb-3 text-base">Select 1st and 2nd Place</h3>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-sm th-muted mb-2 block font-semibold">1st Place</label>
                          <select
                            value={exactaFirst || ''}
                            onChange={(e) => setExactaFirst(e.target.value)}
                            className="w-full p-2 rounded border border-[var(--border)] bg-[var(--bg)] text-sm"
                          >
                            <option value="">Select...</option>
                            {entries
                              .filter((e) => e.playerId !== playerId)
                              .map((entry) => (
                                <option key={entry.playerId} value={entry.playerId}>
                                  {entry.playerName} - {entry.horse.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-sm th-muted mb-2 block font-semibold">2nd Place</label>
                          <select
                            value={exactaSecond || ''}
                            onChange={(e) => setExactaSecond(e.target.value)}
                            className="w-full p-2 rounded border border-[var(--border)] bg-[var(--bg)] text-sm"
                          >
                            <option value="">Select...</option>
                            {entries
                              .filter((e) => e.playerId !== playerId && e.playerId !== exactaFirst)
                              .map((entry) => (
                                <option key={entry.playerId} value={entry.playerId}>
                                  {entry.playerName} - {entry.horse.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {entries.map((entry) => {
                      const isOwnHorse = entry.playerId === playerId
                      const isSelected = selectedPlayer === entry.playerId
                      const isExactaFirstSelected = exactaFirst === entry.playerId
                      const isExactaSecondSelected = exactaSecond === entry.playerId

                      return (
                        <div
                          key={entry.playerId}
                          onClick={() => {
                            if (betType !== 'exacta' && !isOwnHorse) {
                              setSelectedPlayer(entry.playerId)
                            }
                          }}
                          className={`p-4 rounded border-2 transition ${
                            isOwnHorse
                              ? 'border-[var(--border)] opacity-50 cursor-not-allowed'
                              : betType === 'exacta'
                                ? isExactaFirstSelected || isExactaSecondSelected
                                  ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                                  : 'border-[var(--border)]'
                                : isSelected
                                  ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10 cursor-pointer'
                                  : 'border-[var(--border)] hover:border-[var(--accent-green)]/50 cursor-pointer'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-bold">
                                {entry.playerName}
                                {isOwnHorse && ' (You)'}
                                {entry.playerId.startsWith('ai-player-') && ' 🤖'}
                              </h3>
                              <div className="text-sm opacity-70">
                                {entry.horse.name} ({entry.horse.bloodline})
                              </div>
                            </div>
                            {!isOwnHorse && betType !== 'exacta' && (
                              <div className="text-right">
                                <div className="text-sm th-muted font-semibold">
                                  {betType === 'win' ? 'Win' : 'Place'} Odds
                                </div>
                                <div className="font-bold text-xl text-[var(--accent-gold)]">
                                  {betType === 'win' ? `${entry.odds.toFixed(1)}x` : `${entry.placeOdds.toFixed(1)}x`}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="th-muted text-sm mb-1 font-semibold">Horse Stats</div>
                              <div className="grid grid-cols-2 gap-1 text-sm">
                                <div>SPD: {entry.horse.stats.speed}</div>
                                <div>STA: {entry.horse.stats.stamina}</div>
                                <div>GRT: {entry.horse.stats.grit}</div>
                                <div>TMP: {entry.horse.stats.temper}</div>
                              </div>
                            </div>
                            <div>
                              <div className="th-muted text-sm mb-1 font-semibold">Jockey</div>
                              <div className="text-sm">
                                <div className="font-semibold">{entry.jockey.name}</div>
                                <div className="grid grid-cols-3 gap-1 mt-1">
                                  <div>SKL: {entry.jockey.stats.skill}</div>
                                  <div>TMG: {entry.jockey.stats.timing}</div>
                                  <div>WGT: {entry.jockey.stats.weight}</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {!isOwnHorse && (
                            <div className="mt-2 text-sm th-muted font-semibold">
                              Win Probability: {(entry.winProbability * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!betPlaced && (
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={handleSkip}
              className="px-6 py-3 border-2 border-[var(--border)] rounded-lg font-bold hover:border-[var(--text)] transition"
            >
              Skip Betting
            </button>
            <button
              onClick={handlePlaceBet}
              disabled={
                (betType !== 'exacta' && !selectedPlayer) ||
                (betType === 'exacta' && (!exactaFirst || !exactaSecond)) ||
                betAmount < 1 ||
                betAmount > maxBet
              }
              className="px-8 py-3 bg-[var(--accent-green)] text-white rounded-lg font-bold hover:bg-[var(--accent-green)]/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Place Bet - {betAmount}g
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
