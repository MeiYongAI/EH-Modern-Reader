# 开发者指南

## 项目结构详解

```
eh-reader-extension/
├─ manifest.json          # Manifest V3 配置文件
│  ├─ 定义扩展基本信息
│  ├─ 配置权限和主机权限
│  ├─ 注册 content script
│  └─ 定义 background service worker
│
├─ content.js            # 内容脚本（在页面中运行）
│  ├─ 提取原页面的图片数据
│  ├─ 替换原页面 DOM 结构
│  └─ 注入自定义阅读器
│
├─ js/reader.js          # 阅读器核心逻辑
│  ├─ ReaderState - 状态管理
│  ├─ ImageLoader - 图片加载器
│  ├─ PageController - 页面控制
│  ├─ ThumbnailGenerator - 缩略图生成
│  ├─ SettingsManager - 设置管理
│  └─ EventHandler - 事件处理
│
├─ style/reader.css      # 阅读器样式
│  ├─ 全局样式和变量
│  ├─ 暗色模式样式
│  ├─ 响应式布局
│  └─ 动画和过渡效果
│
├─ background.js         # 后台服务 Worker
│  ├─ 扩展安装/更新处理
│  └─ 消息通信处理
│
├─ popup.html/js         # 扩展弹出窗口
│  ├─ 显示扩展状态
│  ├─ 快捷键说明
│  └─ 快速操作按钮
│
└─ welcome.html          # 欢迎页面
   ├─ 功能介绍
   └─ 使用指南
```

## 核心技术实现

### 1. 数据提取（content.js）

从原页面 JavaScript 变量中提取数据：

```javascript
// 提取图片列表
var imagelist = [...];  // 原页面变量
var gid = 3624291;      // 画廊 ID
var pagecount = 60;     // 总页数
```

使用正则表达式解析：
```javascript
const imagelistMatch = content.match(/var imagelist = (\[.*?\]);/s);
const pageData = JSON.parse(imagelistMatch[1]);
```

### 2. DOM 替换

完全重写页面结构：
```javascript
document.body.innerHTML = '';  // 清空原页面
document.body.insertAdjacentHTML('beforeend', readerHTML);
```

### 3. 状态管理

使用闭包和对象封装状态：
```javascript
const ReaderState = {
  currentPage: 1,
  pageCount: 60,
  imagelist: [...],
  settings: {...},
  imageCache: new Map(),
  loadingQueue: new Set()
};
```

### 4. 图片加载

实现缓存和预加载：
```javascript
class ImageLoader {
  static async loadImage(pageIndex) {
    // 1. 检查缓存
    if (ReaderState.imageCache.has(pageIndex)) {
      return ReaderState.imageCache.get(pageIndex);
    }
    
    // 2. 防止重复加载
    if (ReaderState.loadingQueue.has(pageIndex)) {
      // 等待现有请求
    }
    
    // 3. 加载图片
    const img = await this.preloadImage(url);
    
    // 4. 存入缓存
    ReaderState.imageCache.set(pageIndex, img);
    
    return img;
  }
}
```

### 5. 事件处理

统一的事件绑定：
```javascript
class EventHandler {
  static init() {
    // 键盘事件
    document.addEventListener('keydown', handleKeyPress);
    
    // 鼠标事件
    Elements.currentImage.addEventListener('click', handleImageClick);
    
    // 滚轮事件
    document.addEventListener('wheel', handleWheel);
  }
}
```

### 6. 数据持久化

使用 localStorage 保存：
```javascript
// 保存进度
localStorage.setItem(`eh_reader_progress_${gid}`, currentPage);

// 保存设置
localStorage.setItem('eh_reader_settings', JSON.stringify(settings));
```

## API 说明

### E-Hentai 图片获取

#### 当前实现（简化版）
```javascript
// 使用缩略图 URL
const thumbUrl = imageData.t.match(/\(([^)]+)\)/)[1];
```

#### 完整实现（需要）
```javascript
// 1. 通过 API 获取图片页 URL
const imagePageUrl = `https://e-hentai.org/s/${key}/${gid}-${page}`;

// 2. 解析图片页获取真实图片 URL
const response = await fetch(imagePageUrl);
const html = await response.text();
const imgMatch = html.match(/<img[^>]+id="img"[^>]+src="([^"]+)"/);
const fullImageUrl = imgMatch[1];

// 3. 或使用 API
const apiUrl = 'https://api.e-hentai.org/api.php';
const apiData = {
  method: "showpage",
  gidlist: [[gid, key]],
  page: page
};
```

## 调试技巧

### 1. 查看日志
```javascript
// content.js 日志
console.log('[EH Modern Reader]', message);

// 在页面控制台查看
```

### 2. 检查数据
```javascript
// 在浏览器控制台
console.log(window.ehReaderData);     // 页面数据
console.log(ReaderState);              // 阅读器状态
```

### 3. 测试特定页面
```javascript
// 跳转到指定页
PageController.goToPage(10);

// 测试预加载
ImageLoader.loadImage(5);
```

### 4. 模拟事件
```javascript
// 触发翻页
document.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight'}));
```

## 性能优化

### 1. 图片预加载策略
- 只预加载下一页（可配置）
- 使用 Image() 对象预加载
- 缓存已加载的图片

### 2. DOM 操作优化
- 使用 DocumentFragment 批量插入
- 避免强制重排（reflow）
- 使用 CSS transform 代替位置属性

### 3. 事件节流
```javascript
let wheelTimeout;
document.addEventListener('wheel', (e) => {
  clearTimeout(wheelTimeout);
  wheelTimeout = setTimeout(() => {
    handleWheelEvent(e);
  }, 100);
});
```

### 4. 内存管理
```javascript
// 限制缓存大小
if (imageCache.size > MAX_CACHE_SIZE) {
  const oldestKey = imageCache.keys().next().value;
  imageCache.delete(oldestKey);
}
```

## 常见问题

### Q1: 图片无法加载
**原因：**
- 跨域限制
- 图片服务器限流
- Cookie 失效（ExHentai）

**解决：**
```javascript
// 添加错误处理
img.onerror = () => {
  console.error('Image load failed:', url);
  // 显示占位图或重试
};
```

### Q2: 扩展无法启动
**检查：**
1. manifest.json 语法是否正确
2. 文件路径是否正确
3. 权限配置是否完整

### Q3: 样式冲突
**解决：**
```css
/* 使用唯一前缀 */
.eh-modern-reader * {
  /* 重置样式 */
}

/* 使用高优先级选择器 */
body.eh-modern-reader #eh-container {
  /* 样式 */
}
```

### Q4: 进度不保存
**原因：**
- localStorage 被禁用
- 隐私模式

**解决：**
```javascript
try {
  localStorage.setItem('test', '1');
  localStorage.removeItem('test');
} catch (e) {
  console.warn('localStorage unavailable');
  // 使用内存存储
}
```

## 扩展功能

### 添加新的设置项

1. 在 ReaderState 中添加：
```javascript
settings: {
  newSetting: defaultValue
}
```

2. 在 HTML 中添加控件：
```html
<div class="eh-setting-item">
  <label>新设置</label>
  <input type="checkbox" id="eh-new-setting" />
</div>
```

3. 绑定事件：
```javascript
document.getElementById('eh-new-setting').addEventListener('change', (e) => {
  ReaderState.settings.newSetting = e.target.checked;
  SettingsManager.saveSettings();
});
```

### 添加新的快捷键

在 EventHandler.init() 中添加：
```javascript
case 'n':  // N 键
  e.preventDefault();
  // 你的功能
  break;
```

### 自定义主题

1. 定义主题变量：
```css
:root {
  --primary-color: #667eea;
  --background-color: #fff;
}

body.eh-dark-mode {
  --background-color: #1a1a1a;
}
```

2. 应用变量：
```css
.element {
  background: var(--background-color);
  color: var(--primary-color);
}
```

## 发布准备

### 1. 测试清单
- [ ] 功能测试（翻页、设置等）
- [ ] 兼容性测试（Chrome、Edge、Firefox）
- [ ] 性能测试（加载速度、内存占用）
- [ ] 响应式测试（不同屏幕尺寸）
- [ ] 错误处理测试

### 2. 打包发布

#### Chrome Web Store
1. 压缩项目文件夹为 .zip
2. 访问 [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. 上传 .zip 文件
4. 填写商店信息
5. 提交审核

#### Firefox Add-ons
1. 访问 [Firefox Developer Hub](https://addons.mozilla.org/developers/)
2. 提交扩展
3. 等待审核

### 3. 版本更新

更新 manifest.json 版本号：
```json
{
  "version": "1.1.0"
}
```

在 background.js 中处理更新：
```javascript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    // 显示更新日志
  }
});
```

## 贡献指南

### 代码规范
- 使用 2 空格缩进
- 使用分号结尾
- 函数使用 JSDoc 注释
- CSS 使用 BEM 命名（可选）

### 提交规范
```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建/工具变动
```

### Pull Request
1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

## 资源链接

- [Chrome Extension 文档](https://developer.chrome.com/docs/extensions/)
- [Firefox Extension 文档](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Manifest V3 迁移指南](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [E-Hentai API 非官方文档](https://ehwiki.org/wiki/API)

---

Happy Coding! 🚀
