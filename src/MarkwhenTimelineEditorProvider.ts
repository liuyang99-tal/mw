import { TextDecoder } from "util";
import vscode from "vscode";
import { type AppState, type EventPath, useLpc } from "./lpc";
import { useColors } from "./utilities/colorMap";
import { parse } from "./useParserWorker";
import {
  type Eventy,
  type Event,
  get,
  toDateRange,
  type DateRangeIso,
  type DateFormat,
  isEvent,
} from "@markwhen/parser";
import { editEventDateRange } from "./dateTextInterpolation";
import { type DisplayScale } from "./utilities/dateTimeUtilities";

export let webviewPanels = [] as vscode.WebviewPanel[];
const getPanel = () => {
  return webviewPanels[webviewPanels.length - 1];
};

export class MarkwhenTimelineEditorProvider
  implements
  vscode.CustomTextEditorProvider,
  vscode.HoverProvider,
  vscode.FoldingRangeProvider {
  document?: vscode.TextDocument;
  lpc?: ReturnType<typeof useLpc>;
  parseResult?: {
    markwhenState: {
      rawText: string;
      parsed: any[];
      transformed: any;
    };
    appState: {
      colorMap: Record<string, Record<string, string>>;
    };
  };
  view: "timeline" | "calendar" = "timeline";

  public static register(context: vscode.ExtensionContext): {
    providerRegistration: vscode.Disposable;
    editor: MarkwhenTimelineEditorProvider;
  } {
    const provider = new MarkwhenTimelineEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      MarkwhenTimelineEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    );
    return { providerRegistration, editor: provider };
  }

  private static readonly viewType = "markwhen.timeline";

  constructor(private readonly context: vscode.ExtensionContext) { }

  async provideFoldingRanges(
    document: vscode.TextDocument,
    context: vscode.FoldingContext,
    token: vscode.CancellationToken
  ): Promise<vscode.FoldingRange[]> {
    const mw = await parse(document.getText());
    const ranges = [] as vscode.FoldingRange[];
    
    // 使用 foldables 而不是 timelines
    const indices = Object.keys(mw.foldables);
    for (const index of indices) {
      const foldable = mw.foldables[index];
      ranges.push(
        new vscode.FoldingRange(
          foldable.startLine,
          document.positionAt(foldable.endIndex).line,
          foldable.type === "section"
            ? vscode.FoldingRangeKind.Region
            : vscode.FoldingRangeKind.Comment
        )
      );
    }
    return ranges;
  }

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
    return null;
    // const resp = await this.lpc?.hoverFromEditor(
    //   document.offsetAt(position)
    // );
    // if (!resp || !resp.params) {
    //   return null;
    // }
    // const viewInTimelineCommandUri = vscode.Uri.parse(
    //   `command:markwhen.viewInTimeline?${encodeURIComponent(
    //     JSON.stringify(resp.params)
    //   )}`
    // );
    // const view = new vscode.MarkdownString(
    //   `[View in timeline](${viewInTimelineCommandUri})`
    // );
    // // To enable command URIs in Markdown content, you must set the `isTrusted` flag.
    // // When creating trusted Markdown string, make sure to properly sanitize all the
    // // input content so that only expected command URIs can be executed
    // view.isTrusted = true;

    // const rangeFrom = document.positionAt(resp.params.range.from);
    // const rangeTo = document.positionAt(resp.params.range.to);

    // return new vscode.Hover(view, new vscode.Range(rangeFrom, rangeTo));
  }

  public viewInTimeline(...args: any[]) {
    const path = args[0].path;
    this.lpc?.postRequest("jumpToPath", path);
  }

  public async setView(view: "timeline" | "calendar") {
    console.log("[Markwhen] Setting view to:", view);
    this.view = view;
    console.log("[Markwhen] Getting HTML for webview...");
    getPanel().webview.html = await this.getHtmlForWebview(this.view);
    console.log("[Markwhen] HTML loaded, initializing LPC...");

    // @ts-ignore
    this.lpc = await useLpc(getPanel().webview, {
      markwhenState: async (event) => {
        // 直接返回已解析的结果
        return this.parseResult?.markwhenState || {
          rawText: this.document?.getText() || "",
          parsed: [],
          transformed: { properties: [], tags: [], title: '', children: [], source: 'default' }
        };
      },
      appState: () => {
        const appState = this.getAppState();
        this.lpc?.postRequest("appState", appState);
      },
      editEventDateRange: ({
        path,
        range,
        scale,
        preferredInterpolationFormat,
      }: {
        path: EventPath;
        range: DateRangeIso;
        scale: DisplayScale;
        preferredInterpolationFormat: DateFormat | undefined;
      }) => {
        const eventNode = get(
          this.parseResult?.markwhenState.transformed,
          path
        ) as Eventy;
        if (!eventNode) {
          return;
        }
        const event = isEvent(eventNode) ? eventNode : undefined;
        if (!event) {
          return;
        }
        const newText = editEventDateRange(
          event,
          toDateRange(event.dateRangeIso),
          "day",
          undefined
        );
        if (!newText) {
          return;
        }
        const textRange = new vscode.Range(
          new vscode.Position(event.textRanges.datePart.from, 0),
          new vscode.Position(event.textRanges.datePart.to, 0)
        );
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          this.document!.uri,
          textRange,
          newText
        );
        return vscode.workspace.applyEdit(edit);
      },
    });
  }

  onDocumentChange(event: vscode.TextDocumentChangeEvent) {
    if (!this.document) {
      throw new Error("No document");
    }
    if (event.document.uri.toString() === this.document?.uri.toString()) {
      this.updateWebview();
    }
  }

  async parse() {
    const rawText = this.document?.getText() ?? "";
    const parsed = await parse(rawText);
    
    if (!parsed.events || !parsed.events.children || parsed.events.children.length === 0) {
      this.parseResult = {
        markwhenState: {
          rawText,
          parsed: [],
          transformed: { properties: [], tags: [], title: '', children: [], source: 'default' },
        },
        appState: {
          colorMap: {},
        },
      };
      return;
    }
    
    this.parseResult = {
      markwhenState: {
        rawText,
        parsed: parsed,
        transformed: {
          properties: [],
          tags: [],
          title: '',
          children: parsed.events.children,
          source: 'default'
        },
      },
      appState: {
        colorMap: useColors(parsed),
      },
    };
    this.postState();
  }

  async updateWebview() {
    await this.parse();
  }

  public postState() {
    console.log("[Markwhen] Posting state to webview");
    console.log("[Markwhen] markwhenState:", {
      timelineCount: this.parseResult?.markwhenState.parsed.length,
      eventCount: this.parseResult?.markwhenState.transformed.length
    });
    this.lpc?.postRequest("markwhenState", this.parseResult?.markwhenState);
    console.log("[Markwhen] appState:", this.getAppState());
    this.lpc?.postRequest("appState", this.getAppState());
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    this.document = document;
    webviewPanels.push(webviewPanel);

    getPanel().webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'assets'),
        vscode.Uri.joinPath(this.context.extensionUri, 'assets/views'),
        vscode.Uri.joinPath(this.context.extensionUri, 'assets/views/timeline'),
        vscode.Uri.joinPath(this.context.extensionUri, 'assets/views/timeline/assets')
      ]
    };

    await this.setView(this.view);

    vscode.window.onDidChangeActiveColorTheme((theme) => {
      this.lpc?.postRequest("appState", this.getAppState());
    });

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (event) => {
        this.onDocumentChange(event);
      }
    );

    const updateTextRequest = (text: string) => {
      this.setDocument(document, text);
    };

    const showInEditor = (location: number) => {
      const activeTextEditor = vscode.window.activeTextEditor;
      if (activeTextEditor) {
        const position = activeTextEditor.document.positionAt(location);
        activeTextEditor.selections = [
          new vscode.Selection(position, position),
        ];
      }
    };

    getPanel().onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    this.updateWebview();
  }

  getAppState(): AppState {
    const isDark =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
    return {
      isDark,
      hoveringPath: undefined,
      detailPath: undefined,
      colorMap: this.parseResult?.appState.colorMap ?? {},
    };
  }

  private async getHtmlForWebview(
    view: "timeline" | "calendar"
  ): Promise<string> {
    const p = vscode.Uri.joinPath(
      vscode.Uri.file(this.context.asAbsolutePath(`assets/views/${view}/index.html`))
    );
    return vscode.workspace.fs.readFile(p).then((v) => {
      const td = new TextDecoder();
      const s = td.decode(v);
      
      // 检查是否处于开发调试模式
      const isDebug = process.env.NODE_ENV === 'development';
      
      if (isDebug) {
        // 开发模式: 处理资源路径
        return s.replace(
          /(src|href)="([^"]+)"/g,
          (match, attr, path) => {
            // 如果路径已经是绝对路径，则不需要修改
            if (path.startsWith('http') || path.startsWith('//')) {
              return match;
            }
            // 处理相对路径
            const webviewUri = vscode.Uri.joinPath(
              this.context.extensionUri,
              'assets/views',
              view,
              path
            );
            const uri = getPanel().webview.asWebviewUri(webviewUri);
            return `${attr}="${uri.toString()}"`;
          }
        );
      } else {
        // 生产模式: 直接返回合并后的HTML
        return s;
      }
    });
  }

  private setDocument(document: vscode.TextDocument, timelineString: string) {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      timelineString
    );
    return vscode.workspace.applyEdit(edit);
  }
}
