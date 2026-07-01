export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/sessions/:id — full session with messages + intake
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'no session' }, { status: 400 })

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        intake: { orderBy: { order: 'asc' } },
      },
    })

    if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })

    return NextResponse.json({
      id: session.id,
      title: session.title,
      toneSeed: session.toneSeed,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      intake: (session.intake ?? []).map((i) => ({
        question: i.question,
        answer: i.answer,
        order: i.order,
      })),
      messages: (session.messages ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error('[sessions:GET]', err)
    return NextResponse.json({ error: 'could not read the log' }, { status: 500 })
  }
}

// DELETE /api/sessions/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'no session' }, { status: 400 })
    await prisma.session.delete({ where: { id } }).catch(() => null)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[sessions:DELETE]', err)
    return NextResponse.json({ error: 'could not close it' }, { status: 500 })
  }
}
