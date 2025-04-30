const { parentPort } = require("worker_threads");
const { parse } = require("@markwhen/parser");

parentPort.addListener(
  "message",
  async ({ id, payload }: { id: number; payload: any }) => {
    try {
      console.log("[Parser Worker] Starting parse...");
      const result = parse(payload);
      console.log("[Parser Worker] Parse completed, has events:", !!result.events);
      
      parentPort.postMessage({
        id,
        payload: result,
      });
    } catch (error) {
      console.error("[Parser Worker] Error:", error);
      parentPort.postMessage({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
