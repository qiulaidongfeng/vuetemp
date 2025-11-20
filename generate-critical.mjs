import * as critical from 'critical';
import { resolve, dirname, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync, writeFileSync } from 'fs';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

// 基础路径处理
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = resolve(__dirname, './dist');

// 获取HTML文件（仅处理dist根目录）
function getHtmlFiles() {
  if (!existsSync(distDir)) return [];
  return readdirSync(distDir, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .filter(entry => extname(entry.name).toLowerCase() === '.html')
    .map(entry => resolve(distDir, entry.name));
}

// 单个文件处理函数（工作线程执行）
async function processHtmlFile(filePath) {
  try {
    // 生成关键CSS并获取处理后的HTML
    const { html } = await critical.generate({
      src: filePath,
      inline: true,
      base: distDir,
      width: 2500,
      height: 1800,
      penthouse: {
        forceInclude: [], // 后续可手动添加必含样式
        timeout: 30000, // 延长超时时间，确保复杂 CSS 解析完成
        allowInsecure: true // 允许加载 http 资源（若有）
      }
    });

    // 手动写入文件
    writeFileSync(filePath, html, 'utf8');
    return { success: true, filePath };
  } catch (err) {
    return { 
      success: false, 
      filePath: filePath,
      error: err.message || '未知错误'
    };
  }
}

// 工作线程逻辑（修正return位置）
if (!isMainThread) {
  (async () => { // 用立即执行函数包裹，使return在函数内部生效
    const { filePath } = workerData;
    if (!filePath) {
      parentPort.postMessage({
        success: false,
        filePath: '未知路径',
        error: '缺少文件路径参数'
      });
      return; // 此时return在函数内部，合法
    }

    try {
      const result = await processHtmlFile(filePath);
      parentPort.postMessage(result);
    } catch (error) {
      parentPort.postMessage({
        success: false,
        filePath: filePath,
        error: error.message || '处理过程中发生未知错误'
      });
    }
  })();
}

// 主线程逻辑
if (isMainThread) {
  async function generateCriticalCSS() {
    console.log('🔍 扫描 dist 根目录中的 HTML 文件...');
    const htmlFiles = getHtmlFiles();

    if (htmlFiles.length === 0) {
      existsSync(distDir)
        ? console.warn('⚠️ dist 根目录中未找到任何 HTML 文件')
        : console.error('❌ dist 目录不存在，请先运行构建命令');
      return;
    }

    console.log(`✅ 找到 ${htmlFiles.length} 个 HTML 文件：`);
    htmlFiles.forEach((file, i) => console.log(`  ${i + 1}. ${relative(distDir, file)}`));

    console.log('\n⚙️  开始并行处理...');
    const processingPromises = htmlFiles.map(filePath => {
      return new Promise((resolve) => {
        const worker = new Worker(__filename, { workerData: { filePath } });

        worker.on('message', (result) => {
          if (!result || !result.filePath) {
            console.error('❌ 无效的处理结果：', result);
            resolve({ success: false, error: '无效的处理结果' });
            return;
          }

          const relPath = relative(distDir, result.filePath);
          if (result.success) {
            console.log(`✅ 完成：${relPath}`);
          } else {
            console.error(`❌ 失败 [${relPath}]：${result.error}`);
          }
          resolve(result);
        });

        worker.on('error', (err) => {
          const relPath = relative(distDir, filePath);
          console.error(`❌ 线程错误 [${relPath}]：${err.message}`);
          resolve({ success: false, filePath, error: err.message });
        });
      });
    });

    await Promise.all(processingPromises);
    console.log('\n🎉 所有 HTML 文件关键 CSS 生成完成！');
  }

  generateCriticalCSS().catch(err => {
    console.error('❌ 脚本执行失败：', err.message);
  });
}