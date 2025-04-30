import * as vscode from "vscode";
import { parse } from "./useParserWorker";

const tokenTypes = [
  "comment",
  "string",
  "function",
  "variable",
  "parameter",
  "property",
  "keyword",
  "type",
  "class",
];

enum RangeType {
  Comment = "comment",
  CheckboxItemIndicator = "checkboxItemIndicator",
  listItemIndicator = "listItemIndicator",
  ListItemContents = "listItemContents",
  Tag = "tag",
  tagDefinition = "tagDefinition",
  Title = "title",
  View = "view",
  Viewer = "viewer",
  Description = "description",
  Section = "section",
  DateRange = "dateRange",
  DateRangeColon = "dateRangeColon",
  Event = "event",
  Edit = "edit",
  Editor = "editor",
  Recurrence = "recurrence",
  FrontmatterDelimiter = "frontMatterDelimiter",
  HeaderKey = "headerKey",
  HeaderKeyColon = "headerKeyColon",
  HeaderValue = "headerValue"
}

export const legend = new vscode.SemanticTokensLegend(tokenTypes, []);

export const provider: vscode.DocumentSemanticTokensProvider = {
  async provideDocumentSemanticTokens(
    document: vscode.TextDocument
  ): Promise<vscode.SemanticTokens> {
    const tokensBuilder = new vscode.SemanticTokensBuilder(legend);

    const mw = await parse(document.getText());
    
    // 直接使用 ranges 进行语法高亮
    if (mw.ranges) {
      for (const range of mw.ranges) {
        try {
          const startPosition = document.positionAt(range.from);
          const endPosition = document.positionAt(range.to);
          
          // 跳过跨行的 token
          if (startPosition.line !== endPosition.line) {
            continue;
          }
          
          const tokenRange = new vscode.Range(
            startPosition.line,
            startPosition.character,
            startPosition.line,
            endPosition.character
          );
          
          // 根据 range.type 映射到对应的 token 类型
          let tokenType: string;
          switch (range.type as RangeType) {
            case RangeType.FrontmatterDelimiter:
            case RangeType.HeaderKeyColon:
            case RangeType.Section:
              tokenType = 'keyword';
              break;
            case RangeType.HeaderKey:
            case RangeType.DateRange:
              tokenType = 'type';
              break;
            case RangeType.HeaderValue:
              tokenType = 'string';
              break;
            case RangeType.Tag:
              tokenType = 'property';
              break;
            case RangeType.Comment:
              tokenType = 'comment';
              break;
            default:
              tokenType = 'string';
          }
          
          tokensBuilder.push(tokenRange, tokenType);
        } catch (error) {
          // 忽略错误继续处理
          continue;
        }
      }
    }

    return tokensBuilder.build();
  },
};
