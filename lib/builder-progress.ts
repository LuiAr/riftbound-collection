export const BUILD_STEPS = [
  { id: "inventory", title: "Your collection", detail: "Counting owned copies and loading purchase estimates." },
  { id: "references", title: "Reference decks", detail: "Checking current rules and reviewing reference strategies." },
  { id: "build", title: "Building your deck", detail: "Choosing a coherent strategy, key cards and affordable replacements." },
  { id: "validate", title: "Final checks", detail: "Checking rules, purchase costs and access to key cards." },
] as const;
export type BuildStage = typeof BUILD_STEPS[number]["id"];
export type BuildProgress = (stage: BuildStage) => void;

export async function readBuilderStream<T>(response: Response, progress: BuildProgress): Promise<T> {
  if (!response.ok || !response.headers.get("content-type")?.includes("application/x-ndjson")) {
    const data = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(data.error || "This deck could not be generated.");
    return data;
  }
  if (!response.body) throw new Error("The generation connection could not be opened.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let result: T | undefined;
  function consume(line: string) {
    if (!line.trim()) return;
    const event = JSON.parse(line) as { type: string; stage?: BuildStage; result?: T; error?: string };
    if (event.type === "progress" && BUILD_STEPS.some((step) => step.id === event.stage)) progress(event.stage!);
    if (event.type === "result") result = event.result;
    if (event.type === "error") throw new Error(event.error || "Generation stopped. Please try again.");
  }
  try {
    while (true) {
      const chunk = await reader.read();
      pending += decoder.decode(chunk.value, { stream: !chunk.done });
      let end: number;
      while ((end = pending.indexOf("\n")) >= 0) { consume(pending.slice(0, end)); pending = pending.slice(end + 1); }
      if (chunk.done) { consume(pending); break; }
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  if (result === undefined) throw new Error("The connection ended before the deck arrived. Check Recent generations before trying again.");
  return result;
}
