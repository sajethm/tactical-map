export class StubSpeechRecognition {
  static instances: StubSpeechRecognition[] = []

  continuous = false
  interimResults = false
  lang = ''
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null
  onend: (() => void) | null = null
  isStarted = false
  isAborted = false

  constructor() {
    StubSpeechRecognition.instances.push(this)
  }

  static latest(): StubSpeechRecognition {
    const instance = this.instances[this.instances.length - 1]
    if (!instance) throw new Error('No StubSpeechRecognition was constructed')
    return instance
  }

  static reset(): void {
    this.instances = []
  }

  start(): void {
    this.isStarted = true
  }

  stop(): void {
    this.onend?.()
  }

  abort(): void {
    this.isAborted = true
    this.onend?.()
  }

  // Mimics SpeechRecognitionResultList: an array-like of results, each an
  // array-like of alternatives. The hook concatenates every result, so passing
  // several strings models a finalized segment followed by an interim one.
  emit(...transcripts: string[]): void {
    const results: Record<number, unknown> = {}
    transcripts.forEach((transcript, index) => {
      results[index] = { 0: { transcript, confidence: 1 }, isFinal: true, length: 1 }
    })
    this.onresult?.({
      resultIndex: 0,
      results: { ...results, length: transcripts.length },
    } as unknown as SpeechRecognitionEvent)
  }

  fail(error: string): void {
    this.onerror?.({ error } as SpeechRecognitionErrorEvent)
  }
}

export const installSpeechStub = (): void => {
  StubSpeechRecognition.reset()
  window.SpeechRecognition = StubSpeechRecognition as unknown as SpeechRecognitionConstructor
}

export const removeSpeechStub = (): void => {
  delete window.SpeechRecognition
  delete window.webkitSpeechRecognition
}
