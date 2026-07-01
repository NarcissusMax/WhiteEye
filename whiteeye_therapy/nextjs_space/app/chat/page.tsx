import { ChatInterface } from '@/components/whiteeye/chat-interface'

export const dynamic = 'force-dynamic'

export default function ChatPage({
  searchParams,
}: {
  searchParams: { s?: string }
}) {
  return <ChatInterface initialSessionId={searchParams?.s} />
}
