import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeatherPanel from '@/components/WeatherPanel'

describe('WeatherPanel', () => {
  it('lists all five layers and an off row', () => {
    render(<WeatherPanel activeLayer={null} onSelect={() => {}} onClose={() => {}} />)
    for (const label of ['Temperature', 'Precipitation', 'Wind speed', 'Pressure', 'Clouds', 'Off']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('marks the active layer and shows its legend range', () => {
    render(<WeatherPanel activeLayer="temperature" onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Temperature' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('-40 °C')).toBeInTheDocument()
    expect(screen.getByText('40 °C')).toBeInTheDocument()
  })

  it('hides the legend when no layer is active', () => {
    render(<WeatherPanel activeLayer={null} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.queryByText('-40 °C')).not.toBeInTheDocument()
  })

  it('selects a layer, clears with Off, and closes', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<WeatherPanel activeLayer="temperature" onSelect={onSelect} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Precipitation' }))
    expect(onSelect).toHaveBeenCalledWith('precipitation')
    await userEvent.click(screen.getByRole('button', { name: 'Off' }))
    expect(onSelect).toHaveBeenCalledWith(null)
    await userEvent.click(screen.getByRole('button', { name: 'Close weather panel' }))
    expect(onClose).toHaveBeenCalled()
  })
})
