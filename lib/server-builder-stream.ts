import type { BuildProgress } from "./builder-progress";

export function builderStream<T>(run: (progress: BuildProgress) => Promise<T>): Response {
  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: unknown) {
        if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }
      heartbeat = setInterval(() => send({ type: "heartbeat" }), 15000);
      try {
        const result = await run((stage) => send({ type: "progress", stage }));
        send({ type: "result", result });
      } catch (error) {
        send({ type: "error", error: error instanceof Error ? error.message : "This build could not be completed." });
      } finally {
        clearInterval(heartbeat);
        if (!closed) { closed = true; controller.close(); }
      }
    },
    cancel() { closed = true; clearInterval(heartbeat); },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "private, no-store, no-transform", "x-content-type-options": "nosniff" } });
}
