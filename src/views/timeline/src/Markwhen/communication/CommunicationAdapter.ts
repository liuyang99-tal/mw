import type { EventPath } from "@/Timeline/paths";
import type { DisplayScale } from "@/Timeline/utilities/dateTimeUtilities";
import type { Node, NodeArray } from "@markwhen/parser";
import type {
  DateFormat,
  DateRangeIso,
  DateTimeGranularity,
  Timeline,
} from "@markwhen/parser";

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

export interface MessageTypes {
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
  getSvg: any;
}

export interface CommunicationAdapter {
  postMessage<T extends keyof MessageTypes>(
    type: T,
    params?: MessageTypes[T]
  ): void;
  onMessage<T extends keyof MessageTypes>(
    type: T,
    callback: (params: MessageTypes[T]) => void
  ): void;
  initialize(): void;
} 