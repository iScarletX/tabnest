# 🪺 TabNest

> **让标签有处可栖** · 一款开源的浏览器标签智能整理扩展

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/develop/migrate)

TabNest 帮你把浏览器中堆积的几十上百个标签**优雅地整理到分组**，一键写入浏览器 Tab Group 并折叠，立即**释放数 GB 内存**。

## ✨ 特性

- 📥 **自动归档**：标签关掉了？停留 ≥ 2 分钟的会被悄悄收纳到"收件箱"
- 🤖 **AI 智能分组**：本地规则 + LLM 双引擎（BYOK 自带 Key）
- 🎨 **优雅整理台**：拖拽排序、彩色分组、可折叠
- ⚡ **一键应用方案**：把分组写入浏览器 Tab Group，立刻释放内存
- 🚫 **黑名单**：搜索结果、地图、天气等临时页面永不归档
- 🤫 **4 种打扰模式**：从完全手动到 AI 全自动，按需选择
- 🔐 **100% 本地**：所有数据存在 `chrome.storage.local`，永不上传

## 🚀 开发

```bash
pnpm install
pnpm dev      # 开发模式，监听文件变化
pnpm build    # 打包到 dist/
pnpm package  # 打包成 tabnest.zip（上架用）
```

## 📦 加载到 Chrome

1. `pnpm build`
2. 打开 `chrome://extensions/`
3. 右上角打开"开发者模式"
4. 点"加载已解压的扩展程序"，选择本项目的 **`dist/`** 目录
5. 工具栏点击 🪺 图标使用

## 📁 项目结构

```
TabNest-extension/
├── manifest.json              MV3 清单
├── src/
│   ├── background/            ✨ Service Worker
│   │   └── index.ts           监听标签生命周期 / 右键菜单 / 2 分钟阈值
│   ├── content/               注入到网页的脚本（v0.1 占位）
│   ├── popup/                 工具栏图标弹窗
│   ├── options/               全屏整理台
│   ├── features/              ✨ 业务功能（同 Web 原型）
│   │   ├── inbox/
│   │   ├── groups/
│   │   ├── tabs/
│   │   ├── settings/
│   │   └── stats/
│   ├── shared/                通用组件（Header / Toast / 当前模式）
│   ├── store/                 chrome.storage.local 状态管理
│   ├── lib/                   Chrome API 封装
│   └── data/                  常量
├── public/icons/              扩展图标
└── vite.config.ts             基于 @crxjs/vite-plugin
```

## 🗺️ Roadmap

- [x] **v0.1** MVP：基础整理台 + 自动归档 + 本地规则分组
- [ ] **v0.2** 真实 AI 接入（OpenAI / Claude / Gemini）
- [ ] **v0.3** Side Panel + Tab Group 双向同步
- [ ] **v0.4** Chrome Web Store 上架
- [ ] **v1.0** Safari Web Extension 适配

## 📄 License

MIT © 2026 Lei Sun

