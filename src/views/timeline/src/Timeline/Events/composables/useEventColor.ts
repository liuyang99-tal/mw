import type { Eventy } from "@markwhen/parser";
import type { MaybeRef } from "@vueuse/core";
import { ref, unref, watchEffect } from "vue";
import { useTimelineStore } from "../../timelineStore";
import type { Sourced } from "@/Markwhen/useLpc";

export const useEventColor = (eventRef: MaybeRef<Sourced<Eventy>>) => {
  const color = ref<string>();
  const timelineStore = useTimelineStore();

  watchEffect(() => {
    try {
      const node = unref(eventRef);
      let ourTags = node.tags;
      const source = node.source || "default";
      
      // 确保 colors 对象存在
      if (!timelineStore.colors) {
        console.warn('Colors not initialized in timelineStore');
        return;
      }

      // 确保 source 对应的颜色映射存在
      if (!timelineStore.colors[source]) {
        console.warn(`No color mapping found for source: ${source}`);
        return;
      }

      // 确保有标签且标签对应的颜色存在
      if (ourTags && ourTags.length > 0) {
        const tag = ourTags[0];
        if (timelineStore.colors[source][tag]) {
          color.value = timelineStore.colors[source][tag];
        } else {
          console.warn(`No color found for tag: ${tag} in source: ${source}`);
        }
      }
    } catch (error) {
      console.error('Error in useEventColor:', error);
    }
  });

  return { color };
};
