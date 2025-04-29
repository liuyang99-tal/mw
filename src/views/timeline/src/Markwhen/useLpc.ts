import type { EventPath } from "@/Timeline/paths";
import type { Node, NodeArray } from "@markwhen/parser";
import type {
  Timeline,
} from "@markwhen/parser";
import { CommunicationFactory } from "./communication/CommunicationFactory";
import type { MessageTypes } from "./communication/CommunicationAdapter";

export interface AppState {
  isDark?: boolean;
  hoveringPath?: EventPath;
  detailPath?: EventPath;
  path?: string;
  colorMap: Record<string, Record<string, string>>;
}
export interface MarkwhenState {
  rawText?: string;
  parsed: Timeline[];
  transformed?: Node<NodeArray>;
}

export interface TimelineSpecificMessages {
  getSvg: any;
}

type PossibleMessages = MessageTypes & TimelineSpecificMessages;

type MessageType = keyof PossibleMessages;
type MessageParam<T extends keyof PossibleMessages> = PossibleMessages[T];

export interface Message<T extends MessageType> {
  type: T;
  request?: boolean;
  response?: boolean;
  id: string;
  params?: MessageParam<T>;
}
export const getNonce = () => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

type MessageListeners = {
  [Property in keyof MessageTypes]?: (
    event: MessageTypes[Property]
  ) => any;
};

export const useLpc = (listeners?: MessageListeners) => {
  const adapter = CommunicationFactory.createAdapter();

  // 注册消息处理器
  if (listeners) {
    Object.entries(listeners).forEach(([type, handler]) => {
      adapter.onMessage(type as keyof MessageTypes, handler);
    });
  }

  // 初始化适配器
  adapter.initialize();

  return {
    postRequest: <T extends keyof MessageTypes>(
      type: T,
      params?: MessageTypes[T]
    ) => {
      adapter.postMessage(type, params);
    },
  };
};
