export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { buildMirrorPrompt, type IntakeContext } from '@/lib/whiteeye-system-prompt'

const MODEL = 'gpt-5.4'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const primaryId: string | undefined = body?.sessionId
    const extraIds: string[] = Array.isArray(body?.sessionIds) ? body.sessionIds : []
    const ids = Array.from(new Set([primaryId, ...extraIds].filter(Boolean))) as string[]

    if (ids.length === 0) {
      return new Response(JSON.stringify({ error: 'nothing to reflect' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const sessions = await prisma.session.findMany({
      where: { id: { in: ids } },
      include: {
        messages: { where: { role: 'user' }, orderBy: { createdAt: 'asc' } },
        intake: { orderBy: { order: 'asc' } },
      },
    })

    const userWords: string[] = []
    let intake: IntakeContext[] = []
    let toneSeed: string | null = null

    for (const s of sessions ?? []) {
      for (const m of s?.messages ?? []) {
        if ((m?.content ?? '').trim()) userWords.push(m.content.trim())
      }
      for (const i of s?.intake ?? []) {
        if ((i?.answer ?? '').trim()) userWords.push(i.answer.trim())
      }
      if ((s?.intake ?? []).length && intake.length === 0) {
        intake = s.intake.map((i) => ({ question: i.question, answer: i.answer }))
      }
      if (!toneSeed && s?.toneSeed) toneSeed = s.toneSeed
    }

    if (userWords.length === 0) {
      return new Response(
        JSON.stringify({ error: 'you have not given the mirror anything yet' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const corpus = userWords.slice(-60).join('\n---\n').slice(0, 9000)
    const systemPrompt = buildMirrorPrompt(intake, toneSeed)

    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content:
          'here are my own words, everything i\u2019ve said to you across our sessions. hold up the mirror:\n\n' +
          corpus,
      },
    ]

    const apiKey = process.env.ABACUSAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'the mirror is dark' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const upstream = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
        max_tokens: 1200,
      }),
    })

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '')
      console.error('[mirror] upstream error', upstream.status, detail)
      return new Response(JSON.stringify({ error: 'the mirror clouded over. try again.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader()
        let partial = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            partial += decoder.decode(value, { stream: true })
            const lines = partial.split('\n')
            partial = lines.pop() ?? ''
            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith('data:')) continue
              const data = trimmed.slice(5).trim()
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                const delta = parsed?.choices?.[0]?.delta?.content
                if (delta) controller.enqueue(encoder.encode(delta))
              } catch {
                // ignore
              }
            }
          }
        } catch (err) {
          console.error('[mirror] stream error', err)
          controller.error(err)
          return
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[mirror] fatal', err)
    return new Response(JSON.stringify({ error: 'the mirror shattered' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
