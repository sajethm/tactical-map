import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSpeechInput } from '@/hooks/useSpeechInput'
import { StubSpeechRecognition, installSpeechStub, removeSpeechStub } from '@/test/speechStub'

describe('useSpeechInput', () => {
  beforeEach(() => installSpeechStub())
  afterEach(() => removeSpeechStub())

  it('reports unsupported when the browser has no SpeechRecognition', () => {
    removeSpeechStub()
    const { result } = renderHook(() => useSpeechInput({ onTranscript: vi.fn() }))
    expect(result.current.isSupported).toBe(false)
  })

  it('reports supported and configures interim results on start', () => {
    const { result } = renderHook(() => useSpeechInput({ onTranscript: vi.fn() }))
    expect(result.current.isSupported).toBe(true)

    act(() => result.current.start(''))

    const recognition = StubSpeechRecognition.latest()
    expect(recognition.isStarted).toBe(true)
    expect(recognition.interimResults).toBe(true)
    expect(recognition.continuous).toBe(false)
    expect(result.current.isListening).toBe(true)
  })

  it('sends the concatenated transcript to onTranscript', () => {
    const onTranscript = vi.fn()
    const { result } = renderHook(() => useSpeechInput({ onTranscript }))

    act(() => result.current.start(''))
    act(() => StubSpeechRecognition.latest().emit('show all ', 'ships'))

    expect(onTranscript).toHaveBeenCalledWith('show all ships')
  })

  it('appends dictation to text already in the composer', () => {
    const onTranscript = vi.fn()
    const { result } = renderHook(() => useSpeechInput({ onTranscript }))

    act(() => result.current.start('show me'))
    act(() => StubSpeechRecognition.latest().emit('all ships'))

    expect(onTranscript).toHaveBeenCalledWith('show me all ships')
  })

  it('stops listening when recognition ends', () => {
    const { result } = renderHook(() => useSpeechInput({ onTranscript: vi.fn() }))

    act(() => result.current.start(''))
    act(() => result.current.stop())

    expect(result.current.isListening).toBe(false)
  })

  it('surfaces a denied microphone as an error', () => {
    const { result } = renderHook(() => useSpeechInput({ onTranscript: vi.fn() }))

    act(() => result.current.start(''))
    act(() => StubSpeechRecognition.latest().fail('not-allowed'))

    expect(result.current.error).toBe('Microphone access denied.')
  })

  it('stays silent when no speech was detected', () => {
    const { result } = renderHook(() => useSpeechInput({ onTranscript: vi.fn() }))

    act(() => result.current.start(''))
    act(() => StubSpeechRecognition.latest().fail('no-speech'))

    expect(result.current.error).toBeNull()
  })

  it('aborts recognition on unmount', () => {
    const { result, unmount } = renderHook(() => useSpeechInput({ onTranscript: vi.fn() }))

    act(() => result.current.start(''))
    const recognition = StubSpeechRecognition.latest()
    unmount()

    expect(recognition.isAborted).toBe(true)
  })
})
