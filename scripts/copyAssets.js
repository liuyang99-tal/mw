const { cpSync, mkdirSync, existsSync } = require("fs");
const { join } = require("path");

// 确保目标目录存在
const ensureDir = (dir) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

// 复制 timeline 资源
const timelineDist = "views/timeline/dist";
const timelineTarget = "assets/views/timeline";
ensureDir(timelineTarget);
cpSync(timelineDist, timelineTarget, { recursive: true });

// 复制 calendar 资源
const calendarDist = "views/calendar/dist";
const calendarTarget = "assets/views/calendar";
ensureDir(calendarTarget);
cpSync(calendarDist, calendarTarget, { recursive: true });

console.log("资源文件复制完成！");
