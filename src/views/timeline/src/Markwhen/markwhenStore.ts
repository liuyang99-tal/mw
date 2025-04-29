import { equivalentPaths, type EventPath } from "@/Timeline/paths";
import { defineStore } from "pinia";
import { computed, ref, watchEffect } from "vue";
import { useLpc, type AppState, type MarkwhenState } from "./useLpc";
import type {
  DateFormat,
  DateRangeIso,
  DateTimeGranularity,
} from "@markwhen/parser";
import type { DisplayScale } from "@/Timeline/utilities/dateTimeUtilities";
import { useRoute } from "vue-router";
import { parse } from "@markwhen/parser";
import { useColors } from "./useColors";

export const useMarkwhenStore = defineStore("markwhen", () => {
  const route = useRoute();
  const app = ref<AppState>({ colorMap: { default: {} } });
  const markwhen = ref<MarkwhenState>();
  const showEditButton = ref(false);
  const showCopyLinkButton = ref(true);

  const onJumpToPath = ref((path: EventPath) => {});
  const onJumpToRange = ref((range: DateRangeIso) => {});
  const onGetSvg = ref((params: any): any => {});

  const hadInitialState = ref(
    // @ts-ignore
    typeof window !== "undefined" && window.__markwhen_initial_state
  );

  // 添加开发环境下的 mock 数据初始化
  if (process.env.NODE_ENV === 'development') {
    const mockText = `title: 我的时间线
description: 这是一个测试时间线

section 第一部分
2024/01/01: 事件1
2024/02/01: 事件2
endSection

section 第二部分
2024/03/01: 事件3
2024/04/01: 事件4
endSection`;

    const mw = parse(mockText);
    app.value = {
      isDark: false,
      colorMap: useColors(mw.timelines[0]).value,
    };
    markwhen.value = {
      rawText: mockText,
      parsed: mw.timelines,
      transformed: mw.timelines[0].events,
    };
  }

  const hash = computed(() => {
    if (markwhen.value?.rawText) {
      try {
        return btoa(markwhen.value?.rawText);
      } catch (e) {
        return "";
      }
    }
    return "";
  });

  const pathOrHash = computed(() => {
    const { user, timeline } = route.params;
    if (!route.path.includes(".html") && user) {
      return `/${user}` + (timeline ? `/${timeline}` : "");
    }
    if (app.value?.path && app.value.path !== "/") {
      return app.value.path;
    }
    return `#mw=${hash.value}`;
  });

  const editorLink = computed(() => pathOrHash.value);
  const timelineLink = computed(() => pathOrHash.value);
  const embedLink = computed(() => `<iframe src="${timelineLink.value}" />`);

  watchEffect(async () => {
    const { user, timeline } = route.params;
    if (user) {
      try {
        // 使用默认的 mock 数据
        const mockText = `title: 我的时间线
description: 这是一个测试时间线

section 第一部分
2024/01/01: 事件1
2024/02/01: 事件2
endSection

section 第二部分
2024/03/01: 事件3
2024/04/01: 事件4
endSection`;

        const mw = parse(mockText);
        app.value = {
          isDark: false,
          colorMap: useColors(mw.timelines[0]).value,
        };
        markwhen.value = {
          rawText: mockText,
          parsed: mw.timelines,
          transformed: mw.timelines[0].events,
        };
        showEditButton.value = true;
        showCopyLinkButton.value = false;
      } catch (e) {
        console.error("Failed to parse timeline:", e);
      }
    } else if (route.hash && route.hash.startsWith("#mw=")) {
      try {
        const decoded = atob(route.hash.substring("#mw=".length));
        const mw = parse(decoded);
        app.value = {
          isDark: false,
          colorMap: useColors(mw.timelines[0]).value,
        };
        markwhen.value = {
          rawText: decoded,
          parsed: mw.timelines,
          transformed: mw.timelines[0].events,
        };
        showEditButton.value = true;
        showCopyLinkButton.value = false;
      } catch (e) {
        console.error("Failed to parse timeline from hash:", e);
      }
    }
  });

  const { postRequest } = useLpc({
    appState(s) {
      showEditButton.value = false;
      showCopyLinkButton.value = true;
      app.value = s;
    },
    markwhenState: (s) => {
      markwhen.value = s;
    },
    jumpToPath: ({ path }) => {
      onJumpToPath.value?.(path);
    },
    jumpToRange: ({ dateRangeIso }) => {
      onJumpToRange.value?.(dateRangeIso);
    },
    getSvg: (params: any) => onGetSvg.value?.(params),
  });

  const setHoveringPath = (path?: EventPath) => {
    postRequest("setHoveringPath", path);
  };

  const setDetailEventPath = (path?: EventPath) => {
    postRequest("setDetailPath", path);
  };

  const setText = (text: string, at?: { from: number; to: number }) => {
    postRequest("setText", { text, at });
  };

  const showInEditor = (path: EventPath) => {
    postRequest("showInEditor", path);
  };

  const isDetailEventPath = (path: EventPath | undefined) =>
    !!path && equivalentPaths(path, app.value?.detailPath);

  const createEventFromRange = (
    dateRangeIso: DateRangeIso,
    granularity: DateTimeGranularity,
    immediate: boolean = true
  ) => {
    postRequest("newEvent", { dateRangeIso, granularity, immediate });
  };

  const editEventDateRange = (
    path: EventPath,
    dateRangeIso: DateRangeIso,
    scale: DisplayScale,
    preferredInterpolationFormat: DateFormat | undefined
  ) => {
    const params = {
      path,
      range: dateRangeIso,
      scale,
      preferredInterpolationFormat,
    };
    postRequest("editEventDateRange", params);
  };

  const requestStateUpdate = () => {
    postRequest("markwhenState");
    postRequest("appState");
  };

  if (process.env.NODE_ENV !== 'development') {
    requestStateUpdate();
  }

  return {
    app,
    markwhen,
    hadInitialState,

    onJumpToPath,
    onJumpToRange,
    onGetSvg,

    requestStateUpdate,
    setHoveringPath,
    setDetailEventPath,
    isDetailEventPath,
    setText,
    showInEditor,
    createEventFromRange,
    editEventDateRange,

    showEditButton,
    showCopyLinkButton,
    showEmbedButton: showCopyLinkButton,

    timelineLink,
    editorLink,
    embedLink,
  };
});
