import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EntityPanel from '@/components/EntityPanel'
import type { Entity } from '@/lib/types'

const entity = (overrides: Partial<Entity> = {}): Entity => ({
  id: 3,
  kind: 'marker',
  name: 'Rally point',
  lat: 44.5,
  lng: -63.5,
  heading: 0,
  speed_knots: 0,
  status: 'active',
  properties: {},
  ...overrides,
})

const setup = (entityOverrides: Partial<Entity> = {}) => {
  const onDelete = vi.fn()
  render(
    <EntityPanel
      entity={entity(entityOverrides)}
      trackShown={false}
      onClose={vi.fn()}
      onToggleTrack={vi.fn()}
      onDelete={onDelete}
    />,
  )
  return { onDelete, user: userEvent.setup({ pointerEventsCheck: 0 }) }
}

describe('EntityPanel', () => {
  it('offers deletion for a marker', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Delete marker' })).toBeInTheDocument()
  })

  it('does not offer deletion for a ship', () => {
    setup({ kind: 'ship', name: 'Tanker-1', speed_knots: 12 })
    expect(screen.queryByRole('button', { name: 'Delete marker' })).not.toBeInTheDocument()
  })

  it('deletes only after the confirmation is accepted', async () => {
    const { onDelete, user } = setup()

    await user.click(screen.getByRole('button', { name: 'Delete marker' }))
    expect(onDelete).not.toHaveBeenCalled()

    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Rally point')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(3)
  })

  it('does not delete when the confirmation is cancelled', async () => {
    const { onDelete, user } = setup()

    await user.click(screen.getByRole('button', { name: 'Delete marker' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
