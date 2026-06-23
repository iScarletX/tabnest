# Contributing to TabNest 🪺

感谢你愿意为 TabNest 做贡献！

## 🚀 快速开始

```bash
git clone https://github.com/YOUR_USERNAME/tabnest.git
cd tabnest
pnpm install
pnpm dev
```

然后到 `chrome://extensions/` 加载 `dist/` 目录。

## 🐛 报告 Bug

提 Issue 时请尽量提供：
- 你的浏览器和版本
- 复现步骤
- 期望行为 vs 实际行为
- （可选）控制台报错截图

## 💡 提交 Pull Request

1. Fork 仓库
2. 创建 feature 分支：`git checkout -b feature/your-feature`
3. 提交改动：`git commit -m 'feat: add some feature'`
4. 推送到分支：`git push origin feature/your-feature`
5. 提交 Pull Request

### Commit 规范

我们用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：

- `feat:` 新功能
- `fix:` 修 bug
- `docs:` 文档
- `style:` 不影响逻辑的格式调整
- `refactor:` 重构
- `chore:` 构建工具 / 配置等杂项

## 📁 项目结构

```
src/
├── background/   Service Worker（标签生命周期监听）
├── popup/        工具栏图标弹窗
├── options/      全屏整理台
├── features/     业务功能模块
├── shared/       通用组件
├── store/        状态管理
└── lib/          Chrome API 封装
```

## 📜 行为准则

请保持友善、尊重和包容。我们欢迎所有人的贡献。
