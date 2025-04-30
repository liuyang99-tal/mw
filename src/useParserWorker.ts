import { join } from "path";
import { Worker } from "worker_threads";
import { existsSync } from "fs";

let callId = 0;
const currentDir = __dirname;
console.log("[Parser] Extension directory:", currentDir);
console.log("[Parser] Directory contents:", require('fs').readdirSync(currentDir));
console.log("[Parser] worker directory contents:", require('fs').readdirSync(join(currentDir, "worker")));

const workerPath = join(currentDir, "worker", "parser.js");
console.log("[Parser] Creating worker from path:", workerPath);
console.log("[Parser] Worker file exists:", existsSync(workerPath));

let parserWorker: Worker;
try {
  parserWorker = new Worker(workerPath);
  console.log("[Parser] Worker created successfully");
} catch (error) {
  console.error("[Parser] Failed to create worker:", error);
  throw error;
}

const calls = new Map<
  number,
  {
    resolve: (a: any) => void;
    reject: (a: any) => void;
  }
>();

parserWorker.on("message", ({ id, payload, error }: { id: number; payload: any; error?: string }) => {
  if (error) {
    calls.get(id)?.reject(new Error(error));
  } else {
    calls.get(id)?.resolve(payload);
  }
});

export const parse = async (text: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const id = callId++;
    calls.set(id, {
      resolve,
      reject,
    });
    parserWorker.postMessage({ id, payload: text });
  });
};
