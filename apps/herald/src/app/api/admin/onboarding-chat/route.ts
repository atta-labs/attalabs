import { createAnthropic } from '@ai-sdk/anthropic'
import { auth } from '@clerk/nextjs/server'
import { convertToModelMessages, streamText, tool } from 'ai'
import { z } from 'zod'

import { isUsernameTaken } from '@/db/queries'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response('ANTHROPIC_API_KEY not configured', { status: 500 })

  const body = await request.json()
  const anthropic = createAnthropic({ apiKey })
  const modelMessages = await convertToModelMessages(body.messages)

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    messages: modelMessages,
    system: `You are Herald's onboarding assistant. Guide the user through 3 steps to launch their profile.

When the user says "Start onboarding", welcome them warmly and ask for their username. Keep it human, brief, and friendly.

STEPS (follow this exact order):
1. Welcome them with something short and warm like "Hey! Let's get you set up. First — pick a username. This becomes your URL: heyherald.com/username". Then call check_username to validate.
2. Ask for GitHub handle casually: "Got a GitHub? Drop your handle and I'll pull your signals. Or just say skip." Then call verify_github.
3. Ask for CV upload: "Almost there — drop your CV and I'll extract everything automatically." Then call request_cv_upload.

RULES:
- Be human, warm, concise. Like a friend helping you set up, not a form.
- One step at a time. Never rush ahead.
- If username is taken, say something like "Ah, that one's taken! Try another?" and wait for their response.
- If GitHub handle is invalid, be gentle: "Hmm, couldn't find that one. Want to try again or skip?"
- If user says "skip" for GitHub, say "No worries!" and move to CV.
- After all 3 steps complete, call complete_onboarding immediately.
- Keep messages SHORT. 1-2 sentences max per message.`,
    tools: {
      check_username: tool({
        description: 'Check if a username is available for the candidate URL',
        inputSchema: z.object({
          username: z.string().min(3).max(50)
        }),
        execute: async ({ username }: { username: string }) => {
          const reserved = ['admin', 'api', 'sign-in', 'sign-up', 'home', 'onboarding', 'settings']
          if (reserved.includes(username)) {
            return { available: false, reason: 'Reserved word' }
          }
          const taken = await isUsernameTaken(username)
          return { available: !taken, username }
        }
      }),
      verify_github: tool({
        description: 'Verify a GitHub handle exists and get the avatar URL',
        inputSchema: z.object({
          handle: z.string().min(1)
        }),
        execute: async ({ handle }: { handle: string }) => {
          try {
            const res = await fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`)
            if (!res.ok) return { valid: false, handle }
            const data = await res.json()
            return {
              valid: true,
              handle,
              avatarUrl: data.avatar_url as string,
              name: data.name as string | null
            }
          } catch {
            return { valid: false, handle }
          }
        }
      }),
      request_cv_upload: tool({
        description: 'Request the user to upload their CV file. The UI will show a file picker.',
        inputSchema: z.object({})
      }),
      complete_onboarding: tool({
        description: 'All steps are done. Trigger profile creation and redirect to dashboard.',
        inputSchema: z.object({
          username: z.string(),
          githubHandle: z.string().optional()
        })
      })
    }
  })

  return result.toUIMessageStreamResponse()
}
