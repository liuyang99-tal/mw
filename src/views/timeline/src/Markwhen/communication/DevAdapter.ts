import type { CommunicationAdapter, MessageTypes } from "./CommunicationAdapter";
import { parse } from "@markwhen/parser";
import { useColors } from "../useColors";

export class DevAdapter implements CommunicationAdapter {
  private messageHandlers: Map<keyof MessageTypes, Set<Function>> = new Map();
  private mockData: string;

  constructor(mockData: string) {
    this.mockData = mockData;
  }

  initialize(): void {
    // 初始化 mock 数据
    const mw = parse(this.mockData);
    const colorMap = useColors(mw.timelines[0]).value;

    // 触发初始状态
    this.triggerMessage("markwhenState", {
      rawText: this.mockData,
      parsed: mw.timelines,
      transformed: mw.timelines[0].events,
    });

    this.triggerMessage("appState", {
      isDark: false,
      colorMap,
    });
  }

  private triggerMessage<T extends keyof MessageTypes>(
    type: T,
    params: MessageTypes[T]
  ): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => handler(params));
    }
  }

  postMessage<T extends keyof MessageTypes>(
    type: T,
    params?: MessageTypes[T]
  ): void {
    // 在开发环境中，直接触发对应的处理函数
    this.triggerMessage(type, params as MessageTypes[T]);
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