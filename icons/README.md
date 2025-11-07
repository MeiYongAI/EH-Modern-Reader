# 图标文件说明

本扩展需要以下尺寸的图标：

- `icon16.png` - 16x16 像素
- `icon48.png` - 48x48 像素
- `icon128.png` - 128x128 像素

## 制作建议

### 设计风格
- 主题：书籍/阅读器图标
- 颜色：建议使用 #FF6B9D (粉色) 或 #667eea (紫色)
- 风格：现代、扁平化设计

### 推荐工具
1. **在线生成**
   - [Favicon.io](https://favicon.io/)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)

2. **图像编辑器**
   - Photoshop
   - GIMP (免费)
   - Figma (在线)
   - Canva (在线)

3. **图标字体**
   - 使用 📖 emoji 作为基础
   - 使用 Font Awesome 书籍图标

### 快速创建方法

#### 方法 1: 使用 Canvas 生成（开发测试用）
```javascript
// 在浏览器控制台运行
const canvas = document.createElement('canvas');
const sizes = [16, 48, 128];

sizes.forEach(size => {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // 背景
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // 圆角
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();
  
  // 书籍图标
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'white';
  ctx.font = `${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📖', size / 2, size / 2);
  
  // 下载
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icon${size}.png`;
    a.click();
  });
});
```

#### 方法 2: 使用 emoji 截图
1. 打开一个空白网页
2. 设置背景渐变色
3. 居中显示 📖 emoji
4. 截图并裁剪为正方形
5. 调整为需要的尺寸

#### 方法 3: 使用现成图标
访问以下网站下载免费图标：
- [Flaticon](https://www.flaticon.com/)
- [Icons8](https://icons8.com/)
- [Iconfinder](https://www.iconfinder.com/)

搜索关键词：book, reader, library, reading

### 临时解决方案

如果暂时没有图标，可以：
1. 从 manifest.json 中删除 `icons` 字段
2. 扩展会使用浏览器默认图标
3. 功能不受影响

---

**推荐颜色方案：**
- 主色：#667eea (紫色)
- 辅色：#764ba2 (深紫)
- 强调：#FF6B9D (粉色)
