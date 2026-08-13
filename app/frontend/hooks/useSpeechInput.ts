import { useCallback, useEffect, useRef, useState } from 'react'

interface Options {
  onTranscript: (text: string) => void
}

interface SpeechInput {
  isSupported: boolean
  isListening: boolean
  error: string | null
  start: (base: string) => void
  stop: () => void
}

// The user aborting or simply not speaking is normal operation, not a failure
// worth putting in front of an operator.
const SILENT_ERRORS = new Set(['no-speech', 'aborted'])

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access denied.',
  'service-not-allowed': 'Microphone access denied.',
  'audio-capture': 'No microphone found.',
  network: 'Speech service unreachable.',
}

const recognitionCtor = (): SpeechRecognitionConstructor | null =>
  window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null

export function useSpeechInput({ onTranscript }: Options): SpeechInput {
  const [isSupported] = useState(() => recognitionCtor() !== null)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const baseRef = useRef('')
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback((base: string) => {
    const Recognition = recognitionCtor()
    if (!Recognition || recognitionRef.current) return

    const recognition = new Recognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    baseRef.current = base.trim() ? `${base.trimEnd()} ` : ''

    // Every result is re-read on each event so interim words are replaced by
    // their finalized form instead of accumulating twice.
    recognition.onresult = (event) => {
      let spoken = ''
      for (let i = 0; i < event.results.length; i += 1) {
        spoken += event.results[i][0].transcript
      }
      onTranscriptRef.current(baseRef.current + spoken.trimStart())
    }

    recognition.onerror = (event) => {
      if (SILENT_ERRORS.has(event.error)) return
      setError(ERROR_MESSAGES[event.error] ?? 'Voice input failed.')
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setIsListening(false)
    }

    setError(null)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [])

  useEffect(() => () => recognitionRef.current?.abort(), [])

  return { isSupported, isListening, error, start, stop }
}
