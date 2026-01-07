// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { EquipmentSlotsBar } from '@/components/game/EquipmentSlotsBar'

let mockState: {
  reputation: number
  unlockedEquipmentSlots: Array<'saddle' | 'horseshoes' | 'blinders'>
}

vi.mock('@/lib/store/gameStore', () => ({
  useGameStore: (selector?: (state: typeof mockState) => unknown) =>
    selector ? selector(mockState) : mockState,
}))

describe('EquipmentSlotsBar', () => {
  beforeEach(() => {
    mockState = {
      reputation: 0,
      unlockedEquipmentSlots: [],
    }
  })

  it('shows the next unlock cost based on unlocked slots', () => {
    mockState.reputation = 2
    mockState.unlockedEquipmentSlots = ['saddle']

    render(<EquipmentSlotsBar sendMessage={vi.fn()} />)

    const costButtons = screen.getAllByRole('button', { name: /Unlock ⭐2/i })
    expect(costButtons).toHaveLength(2)
    costButtons.forEach((button) => {
      expect(button).toBeEnabled()
    })
  })

  it('sends an unlock message for the selected slot', async () => {
    const user = userEvent.setup()
    const sendMessage = vi.fn()

    mockState.reputation = 1

    render(<EquipmentSlotsBar sendMessage={sendMessage} />)

    const saddleLabel = screen.getByText(/Saddle/i)
    const saddleCard = saddleLabel.parentElement
    expect(saddleCard).not.toBeNull()

    const unlockButton = within(saddleCard as HTMLElement).getByRole('button', { name: /Unlock ⭐1/i })
    await user.click(unlockButton)

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'unlock_equipment_slot',
      slot: 'saddle',
    })
  })

  it('disables unlock buttons when reputation is below the next cost', () => {
    mockState.reputation = 1
    mockState.unlockedEquipmentSlots = ['saddle']

    render(<EquipmentSlotsBar sendMessage={vi.fn()} />)

    const costButtons = screen.getAllByRole('button', { name: /Unlock ⭐2/i })
    costButtons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })
})
