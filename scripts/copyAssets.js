const fs = require('fs');
const path = require('path');

// 确保目标目录存在
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 复制目录
function copyDir(src, dest) {
  ensureDirectoryExists(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 复制 timeline 资源
const timelineSrc = path.join(__dirname, '../src/views/timeline/dist');
const timelineDest = path.join(__dirname, '../assets/views/timeline');
copyDir(timelineSrc, timelineDest);

// 复制 calendar 资源
const calendarSrc = path.join(__dirname, '../src/views/calendar/dist');
const calendarDest = path.join(__dirname, '../assets/views/calendar');
copyDir(calendarSrc, calendarDest);

console.log('资源文件复制完成');
