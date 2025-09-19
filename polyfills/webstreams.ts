// Polyfill for TextEncoderStream and TextDecoderStream in Bun
if (typeof globalThis.TextEncoderStream === 'undefined') {
  class TextEncoderStream {
    readable: ReadableStream<Uint8Array>
    writable: WritableStream<string>

    constructor() {
      const enc = new TextEncoder()
      const ts = new TransformStream<string, Uint8Array>({
        transform(chunk, controller) {
          controller.enqueue(enc.encode(chunk))
        }
      })
      this.readable = ts.readable
      this.writable = ts.writable
    }
  }
  // @ts-ignore
  globalThis.TextEncoderStream = TextEncoderStream
}

if (typeof globalThis.TextDecoderStream === 'undefined') {
  class TextDecoderStream {
    readable: ReadableStream<string>
    writable: WritableStream<Uint8Array>

    constructor(label: string = 'utf-8', options?: any) {
      const dec = new TextDecoder(label, options)
      const ts = new TransformStream<Uint8Array, string>({
        transform(chunk, controller) {
          controller.enqueue(dec.decode(chunk, { stream: true }))
        },
        flush(controller) {
          const tail = dec.decode()
          if (tail) controller.enqueue(tail)
        }
      })
      this.readable = ts.readable
      this.writable = ts.writable
    }
  }
  // @ts-ignore
  globalThis.TextDecoderStream = TextDecoderStream
}
