# vuetemp

一个自动内联css的多网页vue项目模板

改编自我的 https://github.com/qiulaidongfeng/netdisk

运行

```shell
npm install
npm run build

```

**注意：不推荐改用pnpm,实测会在内联关键css时找不到浏览器，运行npm update才解决**

## 工具链

测试node v24.8.0 + npm 11.6.0 运行正常。

## 如何使用

### 初始化

1. 修改package.json的"name"为新项目名字。
2. 删除自己不需要的html,js,vue文件。
3. 更新LICENSE的qiulaidongfeng为自己的名字。

### 增加页面

1. 复制index.html，src/App.vue，src/js/main.js到各源文件同一目录并改名为自己命名的。
2. 更新副本的/src/js/main.js，../App.vue为自己上一步的命名。
3. vite.config.js的seoPrerender.routes更新路由。
4. vite.config.js的build.rollupOptions.input增加新页面。