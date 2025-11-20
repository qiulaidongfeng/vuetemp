import fs from 'fs/promises';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist'); // 构建输出目录

async function flattenPrerenderPaths() {
  console.log('\n[路径转换] 开始处理 dist 目录下的文件...');
  let convertedCount = 0;

  // 递归处理目录
  async function processDir(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(distDir, fullPath);

      // 匹配 x/index.html 格式的文件，但跳过根目录的 index.html
      if (entry.isFile() && entry.name === 'index.html') {
        // 关键判断：当前目录是否为 dist 根目录？
        const isRootIndex = currentDir === distDir;
        if (isRootIndex) {
          console.log(`[跳过] 根目录的 index.html（无需转换）`);
          continue; // 跳过根目录的 index.html
        }

        // 处理子目录中的 index.html（如 user/index.html）
        const parentDir = path.basename(currentDir); // 父目录名（如 user）
        const newFileName = `${parentDir}.html`;
        const newPath = path.join(path.dirname(currentDir), newFileName);

        // 重命名文件
        await fs.rename(fullPath, newPath);
        console.log(`[转换成功] ${relativePath} → ${path.relative(distDir, newPath)}`);
        convertedCount++;

        // 删除空目录
        await fs.rmdir(currentDir).catch(() => {});
      } else if (entry.isDirectory()) {
        await processDir(fullPath);
      }
    }
  }

  try {
    await processDir(distDir);
    console.log(`[路径转换] 全部完成！共处理 ${convertedCount} 个文件\n`);
  } catch (err) {
    console.error('[路径转换] 出错：', err.message);
    process.exit(1);
  }
}

flattenPrerenderPaths();