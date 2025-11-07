# 安装与测试指南

## 快速开始

### 步骤 1: 准备文件

确保项目结构完整：
```
eh-reader-extension/
├─ manifest.json ✓
├─ content.js ✓
├─ background.js ✓
├─ popup.html ✓
├─ popup.js ✓
├─ welcome.html ✓
├─ README.md ✓
├─ DEVELOPMENT.md ✓
├─ style/
│  └─ reader.css ✓
├─ js/
│  └─ reader.js ✓
└─ icons/
   ├─ icon16.png (需要创建)
   ├─ icon48.png (需要创建)
   └─ icon128.png (需要创建)
```

### 步骤 2: 创建图标（临时方案）

如果暂时没有图标，可以临时删除 manifest.json 中的图标引用：

**方法 A - 暂时禁用图标：**
打开 `manifest.json`，删除或注释掉 icons 相关内容：
```json
// 注释掉这些行
// "icons": {
//   "16": "icons/icon16.png",
//   "48": "icons/icon48.png",
//   "128": "icons/icon128.png"
// },
```

**方法 B - 快速创建占位图标：**
1. 打开浏览器，按 F12 进入开发者工具
2. 在 Console 中粘贴以下代码：

```javascript
// 创建三个尺寸的图标
[16, 48, 128].forEach(size => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // 渐变背景
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // 添加文字
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EH', size / 2, size / 2);
  
  // 下载
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icon${size}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
});
```

3. 将下载的三个图标文件放到 `icons/` 文件夹

### 步骤 3: 在 Chrome / Edge 中加载

1. **打开扩展管理页面**
   - Chrome: 在地址栏输入 `chrome://extensions/`
   - Edge: 在地址栏输入 `edge://extensions/`

2. **开启开发者模式**
   - 找到页面右上角的"开发者模式"开关
   - 点击开启

3. **加载扩展**
   - 点击"加载已解压的扩展程序"按钮
   - 浏览并选择 `eh-reader-extension` 文件夹
   - 点击"选择文件夹"

4. **验证安装**
   - 扩展列表中出现"EH Modern Reader"
   - 状态显示"已启用"
   - 可以看到扩展图标（如果添加了图标）

### 步骤 4: 在 Firefox 中加载

1. **打开调试页面**
   - 在地址栏输入 `about:debugging#/runtime/this-firefox`

2. **临时载入附加组件**
   - 点击"临时载入附加组件"按钮
   - 浏览到 `eh-reader-extension` 文件夹
   - 选择 `manifest.json` 文件
   - 点击"打开"

3. **验证安装**
   - 在"临时扩展"列表中看到扩展

## 功能测试

### 测试 1: 基本功能

1. **访问测试页面**
   - 打开 E-Hentai 网站: https://e-hentai.org
   - 找到任意画廊
   - 点击进入画廊详情页
   - 点击顶部的 MPV 按钮（或直接访问 MPV 链接）

2. **验证启动**
   - ✓ 页面应该立即被替换为新的阅读器界面
   - ✓ 左侧显示缩略图列表
   - ✓ 中间显示主图片
   - ✓ 顶部显示工具栏
   - ✓ 底部显示进度条

3. **控制台检查**
   - 按 F12 打开开发者工具
   - 切换到 Console 标签
   - 应该看到日志：
     ```
     [EH Modern Reader] 正在初始化...
     [EH Reader] 初始化阅读器...
     [EH Reader] 阅读器初始化完成
     ```

### 测试 2: 翻页功能

**键盘测试：**
- [ ] 按 `→` 键 - 下一页
- [ ] 按 `←` 键 - 上一页
- [ ] 按 `Home` - 第一页
- [ ] 按 `End` - 最后一页
- [ ] 按 `空格` - 下一页

**鼠标测试：**
- [ ] 点击图片左侧 - 上一页
- [ ] 点击图片右侧 - 下一页
- [ ] 点击左侧导航按钮 ◀
- [ ] 点击右侧导航按钮 ▶
- [ ] 拖动进度条滑块
- [ ] 点击缩略图跳转

**滚轮测试：**
- [ ] 向下滚动 - 下一页
- [ ] 向上滚动 - 上一页

### 测试 3: 工具栏功能

**顶部按钮：**
- [ ] 点击返回按钮（←）- 返回画廊
- [ ] 点击全屏按钮 - 进入全屏
- [ ] 点击主题按钮 - 切换深色模式
- [ ] 点击设置按钮 - 打开设置面板

**设置面板：**
- [ ] 更改图片适配模式 - 图片显示改变
- [ ] 更改图片对齐 - 图片位置改变
- [ ] 切换预加载选项 - 保存成功
- [ ] 切换平滑滚动 - 保存成功
- [ ] 点击关闭按钮 - 面板关闭

### 测试 4: 侧边栏

- [ ] 点击侧边栏切换按钮 - 侧边栏隐藏/显示
- [ ] 按 `F` 键 - 侧边栏切换
- [ ] 滚动缩略图列表 - 平滑滚动
- [ ] 当前页缩略图高亮显示

### 测试 5: 进度记忆

1. 翻到第 10 页
2. 关闭或刷新页面
3. 重新打开同一画廊
4. [ ] 应该自动跳转到第 10 页

### 测试 6: 响应式布局

**调整窗口大小：**
- [ ] 全屏状态 - 布局正常
- [ ] 缩小窗口 - 布局适配
- [ ] 最小窗口 - 可用性保持

**不同设备模拟：**
1. 按 F12 打开开发者工具
2. 点击设备工具栏图标（Ctrl+Shift+M）
3. 测试不同设备尺寸：
   - [ ] iPhone
   - [ ] iPad
   - [ ] 笔记本
   - [ ] 桌面显示器

### 测试 7: 扩展弹出窗口

1. 点击浏览器工具栏的扩展图标
2. [ ] 弹出窗口显示
3. [ ] 状态信息正确
4. [ ] 快捷键列表完整
5. [ ] 点击"刷新页面"按钮有效
6. [ ] 点击"设置"按钮（如果实现）

## 常见问题排查

### 问题 1: 扩展无法加载

**错误提示：** "无法加载扩展"

**解决方案：**
1. 检查 manifest.json 语法
   - 使用 JSON 验证工具：https://jsonlint.com/
   - 确保没有多余的逗号

2. 检查文件路径
   - 所有文件路径必须相对于扩展根目录
   - 路径区分大小写

3. 检查权限
   - Windows: 文件夹不要放在受保护的位置
   - Mac/Linux: 检查文件权限

### 问题 2: 阅读器未启动

**现象：** 访问 MPV 页面后，仍然显示原页面

**排查步骤：**

1. **检查 URL 匹配**
   ```javascript
   // content.js 只在这些 URL 运行
   "matches": [
     "https://e-hentai.org/mpv/*",
     "https://exhentai.org/mpv/*"
   ]
   ```
   确保访问的是 MPV 页面（URL 包含 /mpv/）

2. **检查控制台**
   - 按 F12 打开开发者工具
   - 查看 Console 是否有错误
   - 查看 Network 标签，CSS 和 JS 是否加载

3. **检查 content script**
   - 在开发者工具 → Sources → Content scripts
   - 应该能看到 content.js 和 reader.js

4. **重新加载扩展**
   - 在扩展管理页面点击刷新按钮
   - 重新加载测试页面

### 问题 3: 图片无法显示

**现象：** 加载动画一直转圈

**可能原因：**
1. 图片 URL 解析错误
2. 跨域限制
3. Cookie 失效（ExHentai）

**解决方案：**
```javascript
// 在控制台检查
console.log(window.ehReaderData);  // 查看提取的数据
console.log(ReaderState.imagelist); // 查看图片列表

// 手动测试图片 URL
const testUrl = imagelist[0].t.match(/\(([^)]+)\)/)[1];
console.log(testUrl);
```

### 问题 4: 样式显示异常

**现象：** 布局错乱或样式缺失

**排查：**
1. 检查 CSS 是否加载
   - 开发者工具 → Network → Filter: CSS
   - reader.css 应该成功加载（状态 200）

2. 检查 CSS 路径
   - manifest.json 中 content_scripts.css 路径正确
   - "css": ["style/reader.css"]

3. 清除浏览器缓存
   - Ctrl+Shift+Delete
   - 清除缓存和 Cookie
   - 重新加载页面

### 问题 5: 快捷键不工作

**排查：**
1. 检查焦点位置
   - 快捷键需要页面有焦点
   - 点击页面任意位置获取焦点

2. 检查输入框
   ```javascript
   // 输入框焦点时不响应快捷键
   if (e.target.tagName === 'INPUT') {
     return;
   }
   ```

3. 检查事件监听
   - 控制台输入：`document.addEventListener('keydown', e => console.log(e.key))`
   - 按键查看是否触发

## 性能监控

### Chrome DevTools 性能分析

1. **打开 Performance 面板**
   - F12 → Performance 标签
   - 点击录制按钮
   - 操作阅读器（翻页等）
   - 停止录制

2. **查看指标**
   - FPS: 应保持在 60 左右
   - Main: 主线程活动
   - Heap: 内存使用

### 内存使用检查

1. **打开 Memory 面板**
   - F12 → Memory 标签
   - 选择 "Heap snapshot"
   - 点击"Take snapshot"

2. **对比内存**
   - 翻页前拍摄快照
   - 翻页 20-30 次
   - 再次拍摄快照
   - 对比内存增长

3. **查找内存泄漏**
   - 查看 Detached DOM elements
   - 查看是否有未清理的缓存

## 提交反馈

如果遇到问题，请提供以下信息：

1. **环境信息**
   - 浏览器版本
   - 操作系统
   - 扩展版本

2. **重现步骤**
   - 详细操作步骤
   - 预期结果 vs 实际结果

3. **错误信息**
   - 控制台错误截图
   - Network 请求状态

4. **测试URL**
   - 出问题的具体页面链接

---

## 成功标准 ✓

所有测试通过后，你应该能够：
- ✅ 顺畅翻页
- ✅ 快捷键响应
- ✅ 设置保存生效
- ✅ 进度自动记忆
- ✅ 深色模式切换
- ✅ 侧边栏正常工作
- ✅ 性能流畅，无卡顿
- ✅ 没有控制台错误

恭喜！扩展已成功安装并可以正常使用！🎉
