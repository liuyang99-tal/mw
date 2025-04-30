# Markwhen

View and edit markwhen documents.

Read the markwhen documentation [here](https://docs.markwhen.com).

![](https://blog.markwhen.com/images/calendar_comp3.png)
![](https://blog.markwhen.com/images/calendar2.png)
![](https://blog.markwhen.com/images/calendar_comp2.png)

## Features

- Calendar view
- Map view
- Gantt view
- Timeline View
- Edit from the timeline
- Pages
- Now line
- Tags

## 项目架构

### 1. 整体架构

本项目是一个典型的 VS Code 扩展内嵌视图的前后端分离项目：

1. **后端 (VS Code 扩展)**
   - 负责文档解析、状态管理和与 VS Code 编辑器的交互
   - 使用 TypeScript 开发
   - 运行在 Node.js 环境中
   - 使用 Worker 线程处理文档解析，提高性能
     - 解析器运行在独立的 worker 线程中
     - 使用 JavaScript 文件直接执行，避免 TypeScript 编译问题
     - 通过消息机制与主线程通信

2. **前端 (Webview 视图)**
   - 基于 Vue 3 的 SPA 应用
   - 独立构建和部署
   - 通过 Webview 嵌入到 VS Code 中

### 2. 视图集成方式

视图组件的集成采用了独特的构建-拷贝-引入方式：

1. **构建阶段**

   ```bash
   cd src/views/timeline
   npm run build
   ```

   - 使用 Vite 构建前端项目
   - 生成压缩后的 JS 和 CSS 文件
   - 当前构建未做合并和混淆压缩，以方便调试
   - TODO: 后续可以优化构建流程
     - 将开发环境迁移到 Web 端
     - 开发完成后构建优化版本集成到 Webview
     - 使用代码分割和压缩优化加载性能

2. **拷贝阶段**

   ```javascript
   // scripts/copyAssets.js
   // 复制 timeline 构建产物
   const timelineSrc = path.join(__dirname, '../src/views/timeline/dist');
   const timelineDest = path.join(__dirname, '../assets/views/timeline');
   copyDir(timelineSrc, timelineDest);

   // 复制 calendar 构建产物
   const calendarSrc = path.join(__dirname, '../src/views/calendar/dist');
   const calendarDest = path.join(__dirname, '../assets/views/calendar');
   copyDir(calendarSrc, calendarDest);
   ```

   - 构建产物被拷贝到扩展的 `assets` 目录
   - 保持目录结构一致，确保资源路径正确

3. **引入阶段**

   ```typescript
   // 在扩展中加载视图
   const panel = vscode.window.createWebviewPanel(
     'markwhen.view',
     'Markwhen Timeline',
     vscode.ViewColumn.One,
     {
       enableScripts: true,
       localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'assets')]
     }
   );
   
   // 设置 HTML 内容
   panel.webview.html = getWebviewContent(panel.webview, extensionUri);
   ```

### 3. 数据交互方式

项目采用基于 LPC (Lightweight Process Communication) 的双向通信机制：

1. **通信协议**

   ```typescript
   // 前端定义
   const { postRequest } = useLpc({
     markwhenState(ms) {
       // 处理文档状态变化
       console.log(ms);
     },
     appState(newState) {
       // 处理应用状态变化
       console.log(newState);
     }
   });
   
   // 后端实现
   webview.postMessage({
     type: 'markwhenState',
     params: markwhenState
   });
   ```

2. **数据流向**
   - **编辑器 -> 视图**
     - 文档内容变化时，扩展解析内容
     - 通过 LPC 发送解析后的状态到视图
     - 视图接收状态并更新渲染

   - **视图 -> 编辑器**
     - 用户在视图中进行交互（如拖拽事件）
     - 视图通过 LPC 发送编辑请求
     - 扩展处理请求并更新编辑器内容

3. **状态同步**
   - 使用 Pinia 管理视图状态
   - 通过 LPC 保持扩展和视图状态同步
   - 支持实时预览和编辑

### 4. 核心组件

1. **解析器 (@markwhen/parser)**
   - 解析 Markwhen 文档语法
   - 生成结构化的事件数据
   - 支持实时解析

2. **视图组件**
   - Timeline: 时间线视图
   - Calendar: 日历视图
   - 支持自定义视图扩展

3. **通信层 (@markwhen/view-client)**
   - 实现 LPC 协议
   - 处理消息序列化/反序列化
   - 管理通信状态

### 5. 开发指南

1. **启动开发服务器**

   ```bash
   cd src/views/timeline
   npm install
   npm run dev
   ```

2. **构建生产版本**

   ```bash
   npm run build
   ```

3. **调试扩展**
   - 按 F5 启动调试
   - 选择 "Run Extension" 配置

### 6. 测试数据格式

```markdown
title: 我的时间线
description: 时间线描述

section 第一部分
2024/01/01: 事件1
2024/02/01: 事件2
endSection

section 第二部分
2024/03/01: 事件3
2024/04/01: 事件4
endSection
```

## 自定义开发

### 1. 添加新视图

1. **创建视图组件**

   ```typescript
   import { useLpc } from "@markwhen/view-client";
   
   export default defineComponent({
     setup() {
       const { postRequest } = useLpc({
         // 实现必要的回调
       });
       
       return {
         // 组件逻辑
       };
     }
   });
   ```

2. **注册到扩展**

   ```typescript
   // 在扩展中注册新视图
   vscode.window.registerWebviewPanelSerializer('markwhen.newView', {
     async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel) {
       // 初始化新视图
     }
   });
   ```

### 2. 自定义样式

通过 CSS 变量自定义视图样式：

```css
:root {
  --mw-primary-color: #0078d4;
  --mw-secondary-color: #2b88d8;
  --mw-background-color: #ffffff;
  --mw-text-color: #333333;
}
```

### 3. 扩展功能

1. **自定义交互**
   - 通过 LPC 实现自定义事件处理
   - 扩展编辑器命令

2. **主题集成**
   - 支持 VS Code 主题
   - 自定义颜色方案

## Development Guide

### 项目架构

本项目是一个 VS Code 扩展，用于可视化 Markwhen 文档。主要包含以下组件：

1. **核心组件**
   - `@markwhen/parser`: 解析 Markwhen 文档语法
   - `@markwhen/timeline`: 时间线视图组件
   - `@markwhen/calendar`: 日历视图组件
   - `@markwhen/view-client`: 视图通信工具

2. **视图渲染流程**
   - 文档内容通过 `@markwhen/parser` 解析为结构化数据
   - 解析后的数据通过 `@markwhen/view-client` 传递给视图组件
   - 视图组件（timeline/calendar）接收数据并渲染可视化界面
   - 用户交互通过 `view-client` 回传给编辑器

### 自定义开发

#### 1. 集成视图组件

```typescript
import { useLpc } from "@markwhen/view-client";
import Timeline from "@markwhen/timeline";
import Calendar from "@markwhen/calendar";

// 初始化视图通信
const { postRequest } = useLpc({
  markwhenState(ms) {
    // 处理文档状态变化
    console.log(ms);
  },
  appState(newState) {
    // 处理应用状态变化（暗黑模式、事件悬停等）
    console.log(newState);
  }
});

// 渲染时间线视图
const timeline = new Timeline({
  target: document.getElementById('timeline'),
  props: {
    // 配置项
  }
});

// 渲染日历视图
const calendar = new Calendar({
  target: document.getElementById('calendar'),
  props: {
    // 配置项
  }
});
```

#### 2. 自定义视图样式

视图组件支持通过 CSS 变量自定义样式：

```css
:root {
  --mw-primary-color: #0078d4;
  --mw-secondary-color: #2b88d8;
  --mw-background-color: #ffffff;
  --mw-text-color: #333333;
}
```

#### 3. 扩展功能

1. **添加新视图**
   - 创建新的视图组件
   - 实现 `view-client` 接口
   - 注册到 VS Code 扩展

2. **自定义交互**
   - 通过 `view-client` 的事件系统
   - 实现自定义的事件处理逻辑

3. **主题定制**
   - 支持 VS Code 主题集成
   - 自定义颜色方案

### 开发环境设置

1. 安装依赖

```bash
npm install
```

2. 启动开发服务器

```bash
npm run watch
```

3. 调试扩展

- 按 F5 启动调试
- 选择 "Run Extension" 配置

## Release Notes
