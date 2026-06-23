# 🪺 TabNest

> **让标签有处可栖** · 一款开源的浏览器标签整理扩展

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/develop/migrate)
[![Version](https://img.shields.io/badge/version-v0.1.4-purple.svg)](#)

TabNest 帮你把浏览器中堆积的几十上百个标签**优雅地归到不同分组**，一键写入浏览器 Tab Group 并折叠，立即**释放数 GB 内存**。

不同于浏览器自带的历史记录被动地"记一切"，TabNest 是一台**主动的整理台**——你决定要保留谁，AI 帮你按主题归位，然后一键应用到浏览器。

## ✨ 核心特性

- 📥 **实时待分类**：浏览器里打开但还没归类的标签，自动显示在"待分类"面板
- ✨ **一键智能整理**：自动 AI 分类 → 写入 Chrome Tab Groups → 折叠释放内存，一气呵成
- 🤖 **本地 AI 规则**：内置 10+ 类别（开发/设计/阅读/AI 工具/社交/购物/出行 等）
- 🎯 **AI 兜底机制**：识别不出的标签自动放到"待手动整理"，由你决定归属
- 🎨 **优雅整理台**：拖拽排序、自定义分组颜色、Linear 风高级感配色
- ⚡ **Tab Group 智能复用**：再次应用时复用已有同名分组，不会重复创建
- 🚫 **不重复造轮子**：不做"关闭标签自动归档"（那是浏览器历史记录的事）
- 🔐 **100% 本地**：所有数据存在 `chrome.storage.local`，永不上传

## 🚀 使用

### 安装

1. 下载或克隆本项目
   ```bash
   git clone https://github.com/iScarletX/tabnest.git
   ```
2. 进入项目目录构建
   ```bash
   cd tabnest
   pnpm install
   pnpm build
   ```
3. 打开 Chrome 浏览器：`chrome://extensions/`
4. 打开右上角 **"开发者模式"**
5. 点 **"加载已解压的扩展程序"** → 选择本项目的 `dist/` 目录
6. 工具栏点击 🪺 图标使用

### 使用流程

```
你打开一堆标签
   ↓
TabNest 整理台显示在「待分类」
   ↓
点【一键智能整理】
   ↓
   ① 标签自动归到对应分组
   ② Chrome 顶部出现 Tab Groups 并折叠
   ③ AI 不认识的留在「待手动整理」等你处理
```

### 三段式整理台

```
┌─────────────────────────────────────────┐
│ 📊 内存总览 + 一键智能整理              │
├─────────────────────────────────────────┤
│ 📥 待分类（浏览器打开但还没归类）        │
│   🟢 抖音 / 知乎 / GitHub …             │
├─────────────────────────────────────────┤
│ 📂 我的分组                              │
│   💼 工作  /  📚 学习                    │
│   🧰 工具  /  🍔 生活                    │
├─────────────────────────────────────────┤
│ 🎯 待手动整理（AI 不确定的兜底）         │
└─────────────────────────────────────────┘
```

## 🛠️ 开发命令

```bash
pnpm install     # 安装依赖
pnpm dev         # 开发模式（监听文件变化）
pnpm build       # 构建到 dist/
pnpm package     # 打包成 tabnest.zip（上架用）
```

## 📁 项目结构

```
TabNest/
├── manifest.json              ← Chrome 扩展清单（MV3）
├── src/
│   ├── background/            Service Worker（监听标签事件 + 右键菜单）
│   ├── popup/                 工具栏弹窗
│   ├── options/               全屏整理台
│   ├── features/              业务功能
│   │   ├── inbox/             待分类 / 待手动整理面板
│   │   ├── groups/            分组卡片（含颜色选择器）
│   │   ├── tabs/              标签卡片
│   │   ├── settings/          设置弹窗
│   │   └── stats/             内存可视化 + 一键整理
│   ├── shared/                通用组件（顶栏 / Toast）
│   ├── store/                 chrome.storage.local 状态管理
│   └── lib/                   Chrome API 封装
├── public/icons/              扩展图标 4 尺寸
└── vite.config.ts             基于 @crxjs/vite-plugin
```

## 🗺️ Roadmap

- [x] **v0.1.4 当前版本** - 三段式整理台 / 一键智能整理 / Tab Group 智能复用
- [ ] **v0.2** - 接入真实 AI（OpenAI / Claude / Gemini）做语义分类
- [ ] **v0.3** - 撤销系统 / 数据导入导出 / 多语言（i18n）
- [ ] **v0.4** - Chrome Web Store 上架
- [ ] **v1.0** - Safari Web Extension 适配

## 🎨 设计哲学

| 我们做 | 我们不做 |
|---|---|
| 主动整理：你决定哪些值得保留 | 被动备份：把每个关闭的标签都存下来 |
| 按主题分组：场景化管理 | 按时间线：那是历史记录 |
| 一键应用到浏览器：真正解决卡顿 | 只在工具里好看：用户得不到价值 |
| 简洁的两段式收件箱 | 复杂的多种打扰模式 |

## 🤝 贡献

欢迎提 Issue / PR！请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📄 License

MIT © 2026 [Scarlet Chow](https://github.com/iScarletX)
