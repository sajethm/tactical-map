import { describe, it, expect, vi, afterEach } from 'vitest'
import { deleteEntity } from '@/lib/api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('deleteEntity', () => {
  it('issues a DELETE and returns the deleted id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ deleted_entity_id: 3 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteEntity(3)).resolves.toEqual({ deleted_entity_id: 3 })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/entities/3')
    expect(options.method).toBe('DELETE')
  })

  it('throws when the server refuses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }))
    await expect(deleteEntity(5)).rejects.toThrow(/422/)
  })
})
