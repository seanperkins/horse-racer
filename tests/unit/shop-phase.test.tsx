// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { ShopPhase } from '@/components/game/ShopPhase'
import type { Horse, Jockey, Equipment } from '@/types/game'

let mockState: {
  playerId: string
  gold: number
  shopUnits: Array<{
    id: string
    type: 'horse' | 'jockey' | 'equipment'
    name: string
    cost: number
    data: Horse | Jockey | Equipment
  }>
  horses: Horse[]
  hiredJockey: Jockey | null
  equipment: Equipment[]
  currentRound: number
}

vi.mock('@/lib/store/gameStore', () => ({
  useGameStore: (selector?: (state: typeof mockState) => unknown) =>
    selector ? selector(mockState) : mockState,
}))

describe('ShopPhase', () => {
  beforeEach(() => {
    const horse: Horse = {
      id: 'h1',
      name: 'Test Horse',
      tier: 1,
      bloodline: 'Desert Wind',
      stats: { speed: 1, stamina: 1, grit: 1, temper: 1 },
      potential: { speed: 2, stamina: 2, grit: 2, temper: 2 },
      cost: 4,
    }

    const jockey: Jockey = {
      id: 'j1',
      name: 'Test Jockey',
      stats: { skill: 2, timing: 2, weight: 55 },
      hireCost: 5,
      upkeepCost: 1,
    }

    const equipment: Equipment = {
      id: 'e1',
      name: 'Test Saddle',
      slot: 'saddle',
      effects: { speedMod: 1 },
      cost: 3,
    }

    mockState = {
      playerId: 'p1',
      gold: 5,
      shopUnits: [
        { id: horse.id, type: 'horse', name: horse.name, cost: horse.cost, data: horse },
        { id: jockey.id, type: 'jockey', name: jockey.name, cost: jockey.hireCost, data: jockey },
        { id: equipment.id, type: 'equipment', name: equipment.name, cost: equipment.cost, data: equipment },
      ],
      horses: [],
      hiredJockey: null,
      equipment: [],
      currentRound: 1,
    }
  })

  it('disables hire when gold is insufficient', () => {
    mockState.gold = 2

    render(<ShopPhase sendMessage={vi.fn()} />)

    const hireButton = screen.getByRole('button', { name: /Hire 5g/i })
    expect(hireButton).toBeDisabled()
  })

  it('sends a hire message when the player can afford a jockey', async () => {
    const user = userEvent.setup()
    const sendMessage = vi.fn()

    render(<ShopPhase sendMessage={sendMessage} />)

    const hireButton = screen.getByRole('button', { name: /Hire 5g/i })
    await user.click(hireButton)

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'hire_jockey',
      jockeyId: 'j1',
    })
  })

  it('disables reroll when gold is below 2', () => {
    mockState.gold = 1

    render(<ShopPhase sendMessage={vi.fn()} />)

    const rerollButton = screen.getByRole('button', { name: /Reroll/i })
    expect(rerollButton).toBeDisabled()
  })

  it('sends a reroll message when the player has enough gold', async () => {
    const user = userEvent.setup()
    const sendMessage = vi.fn()

    render(<ShopPhase sendMessage={sendMessage} />)

    const rerollButton = screen.getByRole('button', { name: /Reroll/i })
    await user.click(rerollButton)

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'reroll_shop',
    })
  })
})
