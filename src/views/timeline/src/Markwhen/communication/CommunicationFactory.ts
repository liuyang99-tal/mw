import type { CommunicationAdapter } from "./CommunicationAdapter";
import { VSCodeAdapter } from "./VSCodeAdapter";
import { DevAdapter } from "./DevAdapter";

export class CommunicationFactory {
  static createAdapter(): CommunicationAdapter {
    if (process.env.NODE_ENV === "development") {
      const mockData = `title: 我的时间线
description: 这是一个测试时间线

section 第一部分
2024/01/01: 事件1
2024/02/01: 事件2
endSection

section 第二部分
2024/03/01: 事件3
2024/04/01: 事件4
endSection`;

      return new DevAdapter(mockData);
    }

    return new VSCodeAdapter();
  }
} 