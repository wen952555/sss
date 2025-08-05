// postbuild.js
import fs from 'fs';
import path from 'path';

// 定义源文件和目标文件的路径
const sourceFile = path.resolve(process.cwd(), '_worker.js');
const destDir = path.resolve(process.cwd(), 'dist');
const destFile = path.resolve(destDir, '_worker.js');

// 确保目标目录存在
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// 复制文件
try {
  fs.copyFileSync(sourceFile, destFile);
  console.log('Successfully copied _worker.js to dist/_worker.js');
} catch (err) {
  console.error('Error copying _worker.js:', err);
  process.exit(1); // 如果复制失败，则退出并报告错误
}
