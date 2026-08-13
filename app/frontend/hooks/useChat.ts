import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { postMessage, getMessage } from '@/lib/api'
import type { ChatMessage } from '@/lib/types'

const POLL_INTERVAL_MS = 1_000
const POLL_TIMEOUT_MS = 30_000
const TERMINAL = new Set(['completed', 'needs_clarification', 'failed'])

interface Options {
  initialMessages: ChatMessage[]
  getContext: () => { bounds: [number, number, number, number] | null; selected_entity_id: number | null }
  onReply: (reply: ChatMessage) => void
}

interface Chat {
  messages: ChatMessage[]
  busy: boolean
  error: string | null
  send: (content: string) => void
}

export function useChat({ initialMessages, getContext, onReply }: Options): Chat {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sendMutation = useMutation({
    mutationFn: (content: string) => postMessage(content, getContext()),
    onMutate: () => setError(null),
    onSuccess: (userMessage) => {
      setMessages((prev) => [...prev, userMessage])
      setPendingId(userMessage.id)
    },
    onError: () => setError('Could not send the command.'),
  })

  const pollQuery = useQuery({
    queryKey: ['message', pendingId],
    queryFn: () => getMessage(pendingId as number),
    enabled: pendingId != null,
    gcTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.message.status
      return status && TERMINAL.has(status) ? false : POLL_INTERVAL_MS
    },
  })

  useEffect(() => {
    const data = pollQuery.data
    if (pendingId == null || !data || data.message.id !== pendingId) return
    if (!TERMINAL.has(data.message.status)) return

    setMessages((prev) => {
      const updated = prev.map((m) => (m.id === data.message.id ? data.message : m))
      return data.reply ? [...updated, data.reply] : updated
    })
    if (data.reply) {
      onReply(data.reply)
    } else if (data.message.status === 'failed') {
      setError('Command failed — please try again.')
    }
    setPendingId(null)
  }, [pollQuery.data, pendingId, onReply])

  useEffect(() => {
    if (pendingId == null) return
    const timer = setTimeout(() => {
      setError('Timed out waiting for a response.')
      setPendingId(null)
    }, POLL_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [pendingId])

  return {
    messages,
    busy: sendMutation.isPending || pendingId != null,
    error,
    send: sendMutation.mutate,
  }
}
