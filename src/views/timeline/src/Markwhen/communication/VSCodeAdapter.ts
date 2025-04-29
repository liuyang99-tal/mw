import type { CommunicationAdapter, MessageTypes } from "./CommunicationAdapter";

export class VSCodeAdapter implements CommunicationAdapter {
  private vscodeApi: any;
  private messageHandlers: Map<keyof MessageTypes, Set<Function>> = new Map();

  constructor() {
    this.vscodeApi = (window as any).acquireVsCodeApi?.();
  }

  initialize(): void {
    window.addEventListener("message", this.handleMessage);
  }

  private handleMessage = (event: MessageEvent) => {
    const { type, params } = event.data;
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => handler(params));
    }
  };

  postMessage<T extends keyof MessageTypes>(
    type: T,
    params?: MessageTypes[T]
  ): void {
    if (!this.vscodeApi) {
      console.warn("VSCode API not available");
      return;
    }
    this.vscodeApi.postMessage({ type, params });
  }

  onMessage<T extends keyof MessageTypes>(
    type: T,
    callback: (params: MessageTypes[T]) => void
  ): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)?.add(callback);
  }
} 