import type { EventPath } from "@/Timeline/paths";
import type { DisplayScale } from "@/Timeline/utilities/dateTimeUtilities";
import type {
  DateFormat,
  DateRangeIso,
  DateTimeGranularity,
  Eventy,
  ParseResult,
  Timeline,
} from "@markwhen/parser";
import { useColors } from "./useColors";
import type { EventGroup } from "@markwhen/parser";

export interface AppState {
  isDark?: boolean;
  hoveringPath?: EventPath;
  detailPath?: EventPath;
  path?: string;
  colorMap: Record<string, Record<string, string>>;
}

export type Source = string;
export const defaultSourceName = "default";
export type Sourced<T extends Eventy> = T extends Event
  ? T & { source?: Source }
  : T & { source?: Source; children: Array<Sourced<Eventy>> };

export interface MarkwhenState {
  rawText?: string;
  parsed: ParseResult;
  transformed?: Sourced<EventGroup>;
}

export interface TimelineSpecificMessages {
  getSvg: any;
}
interface MessageTypes {
  markwhenState: MarkwhenState;
  appState: AppState;
  setHoveringPath: EventPath;
  setDetailPath: EventPath;
  setText: {
    text: string;
    at?: {
      from: number;
      to: number;
    };
  };
  showInEditor: EventPath;
  newEvent: {
    dateRangeIso: DateRangeIso;
    granularity?: DateTimeGranularity;
    immediate: boolean;
  };
  editEventDateRange: {
    path: EventPath;
    range: DateRangeIso;
    scale: DisplayScale;
    preferredInterpolationFormat: DateFormat | undefined;
  };
  jumpToPath: {
    path: EventPath;
  };
  jumpToRange: {
    dateRangeIso: DateRangeIso;
  };
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

export interface ResponseMessage<T extends MessageType> extends Message<T> {
  response: true;
  params: MessageParam<T>;
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
  [Property in keyof PossibleMessages]?: (
    event: PossibleMessages[Property]
  ) => any;
};

export const useLpc = (listeners?: MessageListeners) => {
  console.log("[Timeline] Initializing LPC communication");
  const calls: Map<
    string,
    {
      resolve: (a: any) => void;
      reject: (a: any) => void;
    }
  > = new Map();

  const wssUrl =
    typeof window !== "undefined" &&
    // @ts-ignore
    (window.__markwhen_wss_url as string | undefined);

  console.log("[Timeline] WebSocket URL:", wssUrl);

  let socket: WebSocket | undefined;
  let hasConnected = false;
  if (wssUrl) {
    console.log("[Timeline] Attempting WebSocket connection");
    socket = new WebSocket(wssUrl);
    socket.onopen = () => {
      console.log("[Timeline] WebSocket connected");
      hasConnected = true;
      postRequest("appState");
      postRequest("markwhenState");
    };
    socket.onerror = (error) => {
      console.error("[Timeline] WebSocket error:", error);
    };
  }

  let vscApi: { postMessage: (message: any) => void } | undefined = undefined;
  const vscode = () => {
    if (vscApi) {
      return vscApi;
    }
    console.log("[Timeline] Acquiring VS Code API");
    if (typeof acquireVsCodeApi === "undefined") {
      console.error("[Timeline] acquireVsCodeApi is not available");
      throw new Error("VS Code API is not available");
    }
    vscApi = acquireVsCodeApi();
    return vscApi;
  };

  const post = <T extends MessageType>(message: Message<T>) => {
    console.log("[Timeline] Posting message:", message);
    if (socket && hasConnected) {
      socket.send(JSON.stringify(message));
    } else if (typeof acquireVsCodeApi !== "undefined") {
      try {
        vscode()?.postMessage(message);
      } catch (error) {
        console.error("[Timeline] Failed to post message to VS Code:", error);
      }
    } else if (
      typeof window !== "undefined" &&
      typeof window.parent !== "undefined" &&
      window.parent !== window.self
    ) {
      window.parent.postMessage(message, "*");
    } else if (import.meta.env.DEV) {
      console.debug("[Timeline] No communication channel available in development mode");
    } else {
      console.error("[Timeline] No communication channel available");
    }
  };

  const postRequest = <T extends MessageType>(
    type: T,
    params?: MessageParam<T>
  ): Promise<ResponseMessage<T>> => {
    const id = `markwhen_${getNonce()}`;
    return new Promise((resolve, reject) => {
      calls.set(id, { resolve, reject });
      post({
        type,
        request: true,
        id,
        params,
      });
    });
  };

  const postResponse = <T extends MessageType>(
    id: string,
    type: T,
    params?: MessageParam<T>
  ) => post<T>({ type, response: true, id, params });

  const messageListener = <T extends keyof MessageTypes>(
    e: MessageEvent<Message<T>>
  ) => {
    console.log("[Timeline] Raw message event:", e);
    console.log("[Timeline] Message data:", e.data);
    
    if (!e.data) {
      console.error("[Timeline] Received empty message data");
      return;
    }
    
    if (!e.data.id) {
      console.error("[Timeline] Message missing id:", e.data);
      return;
    }
    
    if (!e.data.id.startsWith("markwhen")) {
      console.log("[Timeline] Ignoring non-markwhen message:", e.data.id);
      return;
    }
    
    console.log("[Timeline] Processing message:", e.data);
    console.log("[Timeline] Message type:", e.data.type);
    console.log("[Timeline] Message params:", e.data.params);
    
    const data = e.data;
    if (data.response) {
      console.log("[Timeline] Handling response message");
      calls.get(data.id)?.resolve(data);
      calls.delete(data.id);
    } else if (data.request) {
      console.log("[Timeline] Handling request message");
      const result = listeners?.[data.type]?.(data.params!);
      Promise.resolve(result).then((resp) => {
        console.log("[Timeline] Sending response:", resp);
        postResponse(data.id, data.type, resp);
      });
    } else {
      console.error("[Timeline] Invalid message format - not a request or response:", data);
    }
  };

  if (socket) {
    socket.onmessage = (event) => {
      const messageClone = new MessageEvent("message", {
        data: JSON.parse(event.data),
      });
      messageListener(messageClone);
    };
  } else if (typeof window !== "undefined") {
    window.addEventListener("message", messageListener);
  }

  const initialState =
    typeof window !== "undefined" &&
    // @ts-ignore
    (window.__markwhen_initial_state as State | undefined);
  if (initialState && listeners && listeners.markwhenState) {
    const state = initialState as MarkwhenState;
    const colorMap = useColors(state.parsed).value;
    listeners.markwhenState(initialState);
    listeners.appState?.({
      colorMap,
    });
  }

  return { postRequest };
};
