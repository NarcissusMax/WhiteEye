'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types'

// splits whiteeye's text into paragraphs on blank lines / newlines for readability.
function toParagraphs(text: string): string[] {
  const safe = text ?? ''
  return safe
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function MessageView({ message }: { message: ChatMessage }) {
  const isWhiteeye = message?.role === 'whiteeye'
  const paras = toParagraphs(message?.content ?? '')

  if (isWhiteeye) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="flex w-full justify-start"
      >
        <div className="max-w-[86%] border-l-2 border-[hsl(214_90%_58%_/_0.5)] pl-4 sm:max-w-[75%]">
          {paras.length === 0 ? (
            <span className="font-mono text-sm text-muted-foreground">&hellip;</span>
          ) : (
            paras.map((p, i) => (
              <p
                key={i}
                className="mb-2 whitespace-pre-wrap font-mono text-[0.95rem] leading-relaxed text-foreground/90 last:mb-0"
              >
                {p}
              </p>
            ))
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex w-full justify-end"
    >
      <div
        className={cn(
          'max-w-[86%] rounded-lg rounded-tr-sm bg-[hsl(0_0%_10%)] px-4 py-2.5 sm:max-w-[70%]',
        )}
      >
        {paras.map((p, i) => (
          <p
            key={i}
            className="mb-1.5 whitespace-pre-wrap font-mono text-[0.9rem] leading-relaxed text-foreground/75 last:mb-0"
          >
            {p}
          </p>
        ))}
      </div>
    </motion.div>
  )
}
