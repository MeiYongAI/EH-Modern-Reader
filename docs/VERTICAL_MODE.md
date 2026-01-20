# 纵向连续阅读模式

## 功能概述

纵向连续阅读模式（continuous-vertical）是 EH Modern Reader v2.3.6 新增的阅读模式，允许用户通过上下滚动的方式连续浏览所有页面。

## 特性

### 核心功能
- **垂直滚动浏览**：所有图片按纵向排列，支持鼠标滚轮或触控板上下滚动
- **智能懒加载**：使用 IntersectionObserver 监控可视区域，仅加载进入视口的图片
- **进度跟踪**：自动根据当前视口中心的图片更新页码和进度条
- **缩略图同步**：滚动时自动高亮当前页面对应的缩略图
- **自动滚动支持**：自动播放按钮可持续向下滚动，支持设置 px/帧 速度

### 交互功能
- **三分区点击控制**
  - 上部 1/3：上一页
  - 中部 1/3：切换顶栏/底栏显示
  - 下部 1/3：下一页
- **反向阅读支持**：启用反向阅读时整体垂直翻转（scaleY(-1)）
- **骨架屏加载**：图片加载前显示带渐变动画的占位符

### 性能优化
- **预加载策略**：滚动时预测方向并预加载 4 张相邻图片
- **带宽优化**：视口中心页面优先加载，取消其他预取请求
- **缓存复用**：与单页模式和横向模式共享 imageCache

## 使用方法

### 切换到纵向连续模式
1. 打开 MPV 页面（`/mpv/` URL）
2. 点击右上角设置按钮
3. 在"阅读模式"中选择"纵向连续"

### 模式间切换
- **单页 → 纵向连续**：自动生成所有页面的占位容器并滚动到当前页
- **横向连续 → 纵向连续**：清除横向容器，重建纵向容器
- **纵向连续 → 其他模式**：自动清理观察器和容器，恢复单页显示

## 技术实现

### DOM 结构
```html
<div id="eh-continuous-vertical">
  <div class="eh-cv-card">
    <div class="eh-cv-wrapper eh-cv-skeleton">
      <img data-page-index="0">
    </div>
  </div>
  <!-- 重复 pageCount 次 -->
</div>
```

### CSS 关键样式
- **容器**：`flex-direction: column`, `overflow-y: auto`, 隐藏滚动条
- **包装器**：`aspect-ratio: var(--eh-aspect)` 动态宽高比占位
- **图片**：`object-fit: contain` 保持原始比例

### JavaScript 核心逻辑
- **入口函数**：`enterContinuousVerticalMode()`
- **滚动定位**：`scheduleShowPage()` 中计算 `scrollTop` 位置
- **页面检测**：`onScroll` 事件中计算视口中心元素

## 与横向模式的区别

| 特性 | 横向连续 | 纵向连续 |
|-----|---------|---------|
| **滚动方向** | 水平（scrollLeft） | 垂直（scrollTop） |
| **布局方向** | `flex-direction: row` | `flex-direction: column` |
| **容器 ID** | `#eh-continuous-horizontal` | `#eh-continuous-vertical` |
| **包装器类** | `.eh-ch-wrapper` | `.eh-cv-wrapper` |
| **滚轮映射** | 需要 deltaY → scrollLeft | 原生 deltaY 行为 |
| **反向翻转** | `scaleX(-1)` | `scaleY(-1)` |

## 已知限制

- 图片宽高比未知时使用默认 0.7（2:3 纵向图），可能导致初始布局跳变
- 大量高分辨率图片同时加载时可能占用较多内存
- 触控设备上垂直滑动可能与浏览器手势冲突

## 未来改进方向

- [ ] 支持自定义图片间距和内边距
- [ ] 优化大图加载策略（progressive JPEG 渐进式加载）
- [ ] 支持双栏显示（类似漫画阅读器）
- [ ] 触控设备手势优化（放大/缩小/左右翻页）
