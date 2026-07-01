export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { buildSystemPrompt, type IntakeContext } from '@/lib/whiteeye-system-prompt'

const MODEL = 'gpt-5.4'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sessionId: string | undefined = body?.sessionId
    const userMessage: string = (body?.message ?? '').toString()

    if (!sessionId || !userMessage.trim()) {
      return new Response(JSON.stringify({ error: 'nothing to say?' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // confirm the session exists and pull intake + recent history (db is source of truth)
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        intake: { orderBy: { order: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' }, take: 40 },
      },
    })

    if (!session) {
      return new Response(JSON.stringify({ error: 'this room does not exist' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // persist the user's message first
    await prisma.message.create({
      data: { sessionId, role: 'user', content: userMessage.slice(0, 8000) },
    })

    const intake: IntakeContext[] = (session.intake ?? []).map((i) => ({
      question: i.question,
      answer: i.answer,
    }))

    const systemPrompt = buildSystemPrompt(intake, session.toneSeed)

    const history = (session.messages ?? []).map((m) => ({
      role: m.role === 'whiteeye' ? 'assistant' : 'user',
      content: m.content,
    }))

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ]

    const apiKey = process.env.ABACUSAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'the connection to whiteeye is unset' }), {
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
        max_tokens: 1400,
      }),
    })

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '')
      console.error('[chat] upstream error', upstream.status, detail)
      return new Response(JSON.stringify({ error: 'whiteeye went quiet. try again.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    let fullText = ''

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
                if (delta) {
                  fullText += delta
                  controller.enqueue(encoder.encode(delta))
                }
              } catch {
                // ignore partial json fragments
              }
            }
          }
        } catch (err) {
          console.error('[chat] stream error', err)
          controller.error(err)
          return
        } finally {
          // persist whiteeye's reply once the stream closes
          if (fullText.trim()) {
            try {
              await prisma.message.create({
                data: { sessionId, role: 'whiteeye', content: fullText.slice(0, 12000) },
              })
              await prisma.session.update({
                where: { id: sessionId },
                data: { updatedAt: new Date() },
              })
            } catch (e) {
              console.error('[chat] persist error', e)
            }
          }
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
    console.error('[chat] fatal', err)
    return new Response(JSON.stringify({ error: 'something broke in the dark' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
