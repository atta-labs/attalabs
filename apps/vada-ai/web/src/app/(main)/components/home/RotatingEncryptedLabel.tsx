'use client'

import { useCallback, useEffect, useState } from 'react'

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789αβγδ∑∏∫∂λμπφψω'
const SCRAMBLE_FRAMES = 6
const ANIMATION_SPEED = 40 // ms per frame

/**
 * Hook that returns decrypting text with animation, cycling through words.
 * Triggered by onParticleAbsorb callback (particle hits sphere).
 * Also triggers on initial mount.
 * Format: "word ..."
 */
export function useRotatingEncryptedLabel(words: string[], onParticleAbsorb?: (callback: () => void) => void): string {
  const [currentWordIndex, setCurrentWordIndex] = useState(() => {
    // Random start offset so each label cycles independently
    return Math.floor(Math.random() * words.length)
  })
  const [displayed, setDisplayed] = useState('')

  const currentWord = words[currentWordIndex] ?? ''

  // Trigger next word on particle absorption
  const triggerNextWord = useCallback(() => {
    setCurrentWordIndex((prev) => (prev + 1) % words.length)
  }, [words.length])

  // Register the callback when component mounts
  useEffect(() => {
    if (onParticleAbsorb) {
      onParticleAbsorb(triggerNextWord)
    }
  }, [onParticleAbsorb, triggerNextWord])

  // Decryption animation for the current word
  useEffect(() => {
    setDisplayed(randomize(currentWord))
    let frame = 0
    const total = currentWord.length * SCRAMBLE_FRAMES

    const timer = setInterval(() => {
      frame++
      const settled = Math.floor(frame / SCRAMBLE_FRAMES)
      setDisplayed(
        currentWord
          .split('')
          .map((char, i) => {
            if (i < settled) return char
            if (char === ' ') return ' '
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)] ?? char
          })
          .join('')
      )

      // Animation complete - show full word
      if (frame >= total) {
        setDisplayed(currentWord)
        clearInterval(timer)
      }
    }, ANIMATION_SPEED)

    return () => clearInterval(timer)
  }, [currentWord])

  return `${displayed} ...`
}

function randomize(text: string): string {
  return text
    .split('')
    .map((c) => (c === ' ' ? ' ' : (SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)] ?? c)))
    .join('')
}
