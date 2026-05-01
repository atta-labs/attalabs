'use client'

import { motion } from 'motion/react'

interface ChatBubbleProps {
  children: React.ReactNode
  variant: 'user' | 'vada'
  label?: string
}

export function ChatBubble({ children, variant, label }: ChatBubbleProps) {
  const isUser = variant === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full ${isUser ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`max-w-2xl w-full p-6 border transition-colors ${
          isUser
            ? 'border-foreground/20 bg-transparent rounded-2xl rounded-bl-none'
            : 'border-accent/40 bg-transparent rounded-2xl rounded-br-none'
        }`}
      >
        {label && <span className='block text-[10px] uppercase tracking-widest text-accent/60 mb-2'>{label}</span>}
        <div className={`text-foreground ${isUser ? 'font-serif italic text-2xl' : 'text-lg'}`}>{children}</div>
      </div>
    </motion.div>
  )
}
