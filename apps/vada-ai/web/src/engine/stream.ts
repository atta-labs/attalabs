import type { SSEEvent } from '../schemas'

export class SSEEmitter {
  private encoder = new TextEncoder()
  private controller: ReadableStreamDefaultController | null = null
  private stream: ReadableStream

  constructor() {
    this.stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller
      },
      cancel: () => {
        this.controller = null
      }
    })
  }

  emit(event: SSEEvent): void {
    if (!this.controller) return
    const data = `data: ${JSON.stringify(event)}\n\n`
    this.controller.enqueue(this.encoder.encode(data))
  }

  close(): void {
    this.emit({ type: 'done' })
    this.controller?.close()
    this.controller = null
  }

  toResponse(): Response {
    return new Response(this.stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    })
  }
}
