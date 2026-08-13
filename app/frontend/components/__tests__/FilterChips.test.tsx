import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterChips from '@/components/FilterChips'

describe('FilterChips', () => {
  it('renders nothing with no filters', () => {
    const { container } = render(<FilterChips filters={{}} onClear={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a chip per constraint and a clear button', async () => {
    const onClear = vi.fn()
    render(<FilterChips filters={{ kinds: ['ship'], scope: 'viewport' }} onClear={onClear} />)
    expect(screen.getByText(/ship/)).toBeInTheDocument()
    expect(screen.getByText(/viewport/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onClear).toHaveBeenCalled()
  })
})
