import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatSidebar from '@/components/ChatSidebar'
import { StubSpeechRecognition, installSpeechStub, removeSpeechStub } from '@/test/speechStub'
import type { ChatMessage } from '@/lib/types'

const assistantMessage: ChatMessage = {
  id: 2, role: 'assistant', content: 'Which tanker do you mean?', status: 'completed',
  actions: [{ type: 'ask_clarification', question: 'Which tanker?', choices: ['Tanker-1', 'Tanker-2'] }],
  created_at: '2026-08-12T00:00:01Z',
}

const userMessage: ChatMessage = {
  id: 1, role: 'user', content: 'zoom to the tanker', status: 'needs_clarification',
  actions: [], created_at: '2026-08-12T00:00:00Z',
}

describe('ChatSidebar', () => {
  afterEach(() => removeSpeechStub())

  it('renders message history', () => {
    render(<ChatSidebar messages={[userMessage, assistantMessage]} busy={false} error={null}
                        onSend={vi.fn()} />)
    expect(screen.getByText('zoom to the tanker')).toBeInTheDocument()
    expect(screen.getByText('Which tanker do you mean?')).toBeInTheDocument()
  })

  it('renders clarification chips and sends the chosen one', async () => {
    const onSend = vi.fn()
    render(<ChatSidebar messages={[userMessage, assistantMessage]} busy={false} error={null}
                        onSend={onSend} />)
    await userEvent.click(screen.getByRole('button', { name: 'Tanker-2' }))
    expect(onSend).toHaveBeenCalledWith('Tanker-2')
  })

  it('submits typed input and clears it', async () => {
    const onSend = vi.fn()
    render(<ChatSidebar messages={[]} busy={false} error={null}
                        onSend={onSend} />)
    const input = screen.getByPlaceholderText(/command/i)
    await userEvent.type(input, 'show all ships{enter}')
    expect(onSend).toHaveBeenCalledWith('show all ships')
    expect(input).toHaveValue('')
  })

  it('disables input while busy', () => {
    render(<ChatSidebar messages={[]} busy error={null} onSend={vi.fn()} />)
    expect(screen.getByPlaceholderText(/command/i)).toBeDisabled()
  })

  it('disables the mic with an explanation when speech is unsupported', () => {
    removeSpeechStub()
    render(<ChatSidebar messages={[]} busy={false} error={null}
                        onSend={vi.fn()} />)
    const mic = screen.getByRole('button', { name: /start voice input/i })
    expect(mic).toBeDisabled()
    expect(mic).toHaveAttribute('title', expect.stringMatching(/chrome/i))
  })

  it('starts listening when the mic is clicked', async () => {
    installSpeechStub()
    render(<ChatSidebar messages={[]} busy={false} error={null}
                        onSend={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /start voice input/i }))

    const mic = screen.getByRole('button', { name: /stop voice input/i })
    expect(mic).toHaveAttribute('aria-pressed', 'true')
    // Matched on the tail of the note: "Listening" alone also appears in the
    // sr-only live region, and getByText throws on multiple matches.
    expect(screen.getByText(/speak your command/i)).toBeInTheDocument()
  })

  it('puts the transcript in the composer without sending it', async () => {
    installSpeechStub()
    const onSend = vi.fn()
    render(<ChatSidebar messages={[]} busy={false} error={null}
                        onSend={onSend} />)
    await userEvent.click(screen.getByRole('button', { name: /start voice input/i }))
    act(() => StubSpeechRecognition.latest().emit('show all ships'))

    expect(screen.getByPlaceholderText(/command/i)).toHaveValue('show all ships')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('appends dictation to text already typed', async () => {
    installSpeechStub()
    render(<ChatSidebar messages={[]} busy={false} error={null}
                        onSend={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/command/i), 'show me')
    await userEvent.click(screen.getByRole('button', { name: /start voice input/i }))
    act(() => StubSpeechRecognition.latest().emit('all ships'))

    expect(screen.getByPlaceholderText(/command/i)).toHaveValue('show me all ships')
  })

  it('sends a dictated command through the normal submit path', async () => {
    installSpeechStub()
    const onSend = vi.fn()
    render(<ChatSidebar messages={[]} busy={false} error={null}
                        onSend={onSend} />)
    await userEvent.click(screen.getByRole('button', { name: /start voice input/i }))
    act(() => StubSpeechRecognition.latest().emit('show all ships'))
    await userEvent.click(screen.getByRole('button', { name: 'Send command' }))

    expect(onSend).toHaveBeenCalledWith('show all ships')
    expect(screen.getByPlaceholderText(/command/i)).toHaveValue('')
  })

  it('shows a microphone permission error', async () => {
    installSpeechStub()
    render(<ChatSidebar messages={[]} busy={false} error={null}
                        onSend={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /start voice input/i }))
    act(() => StubSpeechRecognition.latest().fail('not-allowed'))

    expect(screen.getByText('Microphone access denied.')).toBeInTheDocument()
  })
})
