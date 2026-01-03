// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { HorizontalStatBars } from '@/components/game/HorizontalStatBars'

describe('HorizontalStatBars', () => {
  it('clamps current bar width to 100%', () => {
    const { container } = render(
      <HorizontalStatBars
        stats={{ spd: 20 }}
        maxValue={10}
        statLabels={{ spd: 'Speed' }}
      />
    )

    const bars = container.querySelectorAll('div[style*="width"]')
    expect(bars.length).toBe(1)
    expect(bars[0]).toHaveStyle({ width: '100%' })
  })

  it('clamps negative values to 0%', () => {
    const { container } = render(
      <HorizontalStatBars
        stats={{ spd: -5 }}
        maxValue={10}
        statLabels={{ spd: 'Speed' }}
      />
    )

    const bars = container.querySelectorAll('div[style*="width"]')
    expect(bars.length).toBe(1)
    expect(bars[0]).toHaveStyle({ width: '0%' })
  })

  it('shows the tooltip on hover when a description is provided', async () => {
    const user = userEvent.setup()
    render(
      <HorizontalStatBars
        stats={{ spd: 5 }}
        maxValue={10}
        statLabels={{ spd: 'Speed' }}
        statDescriptions={{ spd: 'Speed description' }}
      />
    )

    const label = screen.getByText('Speed')
    await user.hover(label)

    expect(screen.getByText('Speed description')).toBeInTheDocument()
  })
})
