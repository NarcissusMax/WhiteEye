export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { INTAKE_QUESTIONS } from '@/lib/types'

// POST /api/sessions — create a new session with intake answers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const answers: { question?: string; answer?: string; order?: number }[] = Array.isArray(
      body?.answers,
    )
      ? body.answers
      : []

    // derive a tone seed from the comfort/truth question if present
    let toneSeed: string | null = null
    for (const a of answers) {
      const ans = (a?.answer ?? '').toLowerCase()
      if (ans.includes('truth')) toneSeed = 'truth'
      else if (ans.includes('comfort')) toneSeed = toneSeed ?? 'comfort'
    }

    // build a short title from the first answer
    const first = (answers?.[0]?.answer ?? '').trim()
    const title = first ? first.slice(0, 48).toLowerCase() : 'untitled'

    const session = await prisma.session.create({
      data: {
        title,
        toneSeed,
        intake: {
          create: answers
            .filter((a) => (a?.answer ?? '').trim().length > 0)
            .map((a, idx) => ({
              question: (a?.question ?? INTAKE_QUESTIONS?.[idx]?.prompt ?? '').slice(0, 500),
              answer: (a?.answer ?? '').slice(0, 2000),
              order: typeof a?.order === 'number' ? a.order : idx,
            })),
        },
      },
      include: { intake: true },
    })

    return NextResponse.json({
      id: session.id,
      title: session.title,
      toneSeed: session.toneSeed,
      createdAt: session.createdAt.toISOString(),
    })
  } catch (err) {
    console.error('[sessions:POST]', err)
    return NextResponse.json({ error: 'could not open the room right now' }, { status: 500 })
  }
}
