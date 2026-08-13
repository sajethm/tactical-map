import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDialog from '@/components/ui/confirm-dialog'

const setup = (overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) => {
  const onConfirm = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Delete marker"
      description="Rally point will be removed permanently."
      confirmLabel="Delete"
      onConfirm={onConfirm}
      {...overrides}
    />,
  )
  return { onConfirm, onOpenChange, user: userEvent.setup({ pointerEventsCheck: 0 }) }
}

describe('ConfirmDialog', () => {
  it('shows the title, description, and both actions', () => {
    setup()
    expect(screen.getByRole('alertdialog', { name: 'Delete marker' })).toBeInTheDocument()
    expect(screen.getByText('Rally point will be removed permanently.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('renders nothing while closed', () => {
    setup({ open: false })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('confirms and closes', async () => {
    const { onConfirm, onOpenChange, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('cancels without confirming', async () => {
    const { onConfirm, onOpenChange, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('accepts a custom cancel label', () => {
    setup({ cancelLabel: 'Keep it' })
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument()
  })
})
