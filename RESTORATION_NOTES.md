# 恢复说明 - v2.3.5

## 恢复日期
2026年1月20日

## 恢复内容

### 已移除的功能

#### 1. 评论区修改功能（已完全恢复原始状态）
- ❌ 移除自定义评论弹窗 (`openCommentsOverlay`)
- ❌ 移除浮动"发评论"按钮
- ❌ 移除自动展开全部评论功能
- ❌ 移除评论链接拦截逻辑
- ❌ 移除独立的"查看评论"入口按钮

**现在的行为**：评论区保持 E-Hentai 原生显示方式，用户可以像访问原站一样查看和发表评论。

#### 2. 画廊页缩略图自动展开功能（已完全移除）
- ❌ 移除自动展开所有缩略图功能 (`expandAllThumbnails`)
- ❌ 移除缩略图展开缓存机制 (`saveExpandedToCache`, `restoreExpandedFromCache`)
- ❌ 移除缩略图持久化观察器 (`startThumbnailPersistenceObserver`)
- ❌ 移除缩略图占位样式 (`applyThumbnailPlaceholders`)
- ❌ 移除 `fetchGalleryPageDom` 等相关辅助函数

**现在的行为**：画廊页保持原始的分页显示，用户需要点击页码来浏览其他页的缩略图。

### 保留的功能
✅ EH Modern Reader 启动按钮（在画廊页右侧操作面板）
✅ 缩略图点击拦截（直接启动阅读器并跳转到对应页）
✅ MPV 阅读器核心功能（在 content.js 中）
✅ 阅读历史记录
✅ 收藏管理
✅ Popup 导航中心

## 文件变更

### gallery.js
- **原始行数**: 851 行
- **修改后行数**: 411 行
- **删除行数**: 440 行
- **备份文件**: `gallery.js.backup` (已创建)

### 主要修改点
1. 移除 lines 387-400: "查看评论"按钮创建代码
2. 移除 lines 446-836: 所有评论弹窗、缩略图展开相关函数

### manifest.json
- 版本号更新: `2.3.4` → `2.3.5`

### CHANGELOG.md
- 添加 v2.3.5 版本说明，记录已移除的功能

## 验证

### 语法检查
```bash
node -c gallery.js
# ✅ 通过，无语法错误
```

### 功能验证
```bash
grep -r "openCommentsOverlay" gallery.js
# ✅ 无匹配结果

grep -r "expandAllThumbnails" gallery.js
# ✅ 无匹配结果
```

## 测试建议

在浏览器中加载修改后的扩展，访问画廊页面验证：

1. ✅ 评论区应该显示在页面底部（原生位置）
2. ✅ 不应该有浮动的"发评论"按钮
3. ✅ 不应该有"查看评论"独立按钮
4. ✅ 缩略图应该按照原站的分页方式显示
5. ✅ 底部应该有分页导航条
6. ✅ "EH Modern Reader" 启动按钮应该正常工作
7. ✅ 点击缩略图应该能启动阅读器并跳转到对应页面

## 回滚方式

如需恢复之前的版本：
```bash
cp gallery.js.backup gallery.js
```

## 相关参考

- 原始 E-Hentai 画廊示例: `9508f90af6.html`
- 备份文件: `gallery.js.backup`
