import { parse } from "@markwhen/parser";
import type { MarkwhenState, AppState, Sourced } from "./Markwhen/useLpc";
import type { EventGroup } from "@markwhen/parser";
import testData from './example.mw?raw';
import { useColors } from "./Markwhen/useColors";

export function getTestData(): { markwhen: MarkwhenState; app: AppState } {
  const parsed = parse(testData);
  console.log('解析后的数据:', parsed);

  // 使用 useColors 生成颜色映射
  const colors = useColors(parsed);

  return {
    markwhen: {
      rawText: testData,
      parsed: parsed,
      transformed: {
        ...parsed.events,
        source: 'default'
      } as Sourced<EventGroup>
    },
    app: {
      isDark: true,
      colorMap: colors.value
    }
  };
} 