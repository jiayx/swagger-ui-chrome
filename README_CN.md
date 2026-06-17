# Swagger UI Chrome 扩展

<div align="center">
  <img src="swagger-ui/favicon-32x32.png" alt="Swagger UI Logo" width="128" height="128">

  [![Chrome Web Store](https://img.shields.io/chrome-web-store/v/liacakmdhalagfjlfdofigfoiocghoej)](https://chrome.google.com/webstore/detail/swagger-ui/liacakmdhalagfjlfdofigfoiocghoej)
  [![License](https://img.shields.io/github/license/jiayx/swagger-ui-chrome)](LICENSE)
  [![GitHub Stars](https://img.shields.io/github/stars/jiayx/swagger-ui-chrome?style=social)](https://github.com/jiayx/swagger-ui-chrome)

  [English](README.md) | [简体中文](README_CN.md)
</div>

## 📋 概述

一个强大的 Chrome 扩展，将 Swagger UI 打包成浏览器插件，让您可以直接在浏览器中轻松查看和测试 OpenAPI/Swagger 文档。非常适合需要快速访问 API 文档而不想搭建本地服务器的 API 开发者和测试人员。

## ✨ 功能特点

- 🚀 **即时访问** - 一键查看 Swagger/OpenAPI 文档
- 🎨 **多主题支持** - 从多种内置主题中选择，或从 GitHub 加载自定义主题
- 📁 **本地文件支持** - 打开本地的 JSON/YAML API 文档文件
- 🔗 **URL 支持** - 从任意 URL 加载 API 文档
- 💾 **持久化设置** - 自动保存您的主题偏好设置
- 🔒 **安全** - 在浏览器本地运行，仅需最小权限

## 📦 安装方法

### 方法一：Chrome 网上应用店（推荐）

1. 访问 [Chrome 网上应用店](https://chrome.google.com/webstore/detail/swagger-ui/liacakmdhalagfjlfdofigfoiocghoej)
2. 点击「添加至 Chrome」
3. 确认安装

### 方法二：手动安装

1. 克隆仓库：
   ```bash
   git clone https://github.com/jiayx/swagger-ui-chrome.git
   cd swagger-ui-chrome
   ```

2. 更新 Swagger UI 到最新版本：
   ```bash
   ./scripts/update.sh
   ```

3. 在 Chrome 中加载扩展：
   - 打开 Chrome 并访问 `chrome://extensions/`
   - 在右上角启用「开发者模式」
   - 点击「加载已解压的扩展程序」
   - 选择项目根目录

## 🎯 使用方法

### 基本使用

1. **点击扩展图标**（位于 Chrome 工具栏）
2. 输入 API 文档 **URL**
3. **查看并交互**您的 API 文档

### 主题自定义

1. 右键点击扩展图标，选择「选项」
2. 浏览可用主题：
   - **GitHub 主题** - 从 GitHub 仓库动态加载
   - 主题实时从配置的仓库获取
3. 通过截图预览主题效果（如果可用）
4. 点击主题卡片即可立即应用主题

## 🛠️ 开发

### 工作原理

该扩展将 Swagger UI 打包为 Chrome 扩展，架构如下：

1. **Service Worker** (`background.js`)：处理扩展图标点击事件，在新标签页中打开 Swagger UI
2. **Swagger UI 集成**：使用官方 Swagger UI 发行版，配合自定义初始化器
3. **主题系统**：从 GitHub 仓库动态获取并应用 CSS 主题
4. **存储**：使用 Chrome 的存储 API 持久化用户偏好设置（选定的 URL 和主题）
5. **Manifest V3**：符合 Chrome 最新的扩展架构，提供更好的安全性和性能

### 前置要求

- Git
- Chrome 浏览器
- Chrome 扩展基础知识

### 项目结构

```
swagger-ui-chrome/
├── swagger-ui/              # Swagger UI 发行版文件
│   ├── index.html           # 主页面
│   ├── swagger-ui-bundle.js # Swagger UI 核心包
│   ├── swagger-ui.css       # Swagger UI 样式
│   └── swagger-initializer.js # 自定义初始化脚本
├── src/                     # 扩展源代码
│   ├── background.js        # Service Worker（扩展后台脚本）
│   ├── swagger-initializer.js # Swagger UI 初始化模板
│   ├── options.html         # 主题设置页面
│   └── options.js           # 主题管理逻辑
├── scripts/                 # 构建和更新脚本
│   ├── fetch_assets.sh      # 获取上游 Swagger UI 发行版
│   ├── update.sh            # 刷新 Swagger UI 资源并复制自定义初始化脚本
│   └── bundle.sh            # 将扩展打包为 zip 文件
├── _locales/                # 国际化文件
│   ├── en/                  # 英文消息
│   └── zh_CN/               # 中文消息
├── manifest.json            # 扩展清单文件（V3版本）
└── LICENSE                  # MIT 许可证
```

### 从源码构建

1. 修改源代码
2. 通过加载未打包扩展进行本地测试
3. 运行更新脚本以获取最新的 Swagger UI 发行版：
   ```bash
   ./scripts/update.sh
   ```

   该脚本将会：
   - 下载最新的 Swagger UI 发行版
   - 清理不必要的文件
   - 复制自定义初始化脚本

   主题 CSS 不会由该脚本打包进项目，而是在选项页中从配置的 GitHub 仓库动态加载。

### 贡献代码

欢迎贡献代码！请随时提交 Pull Request。对于重大更改，请先开启 Issue 讨论您想要更改的内容。

1. Fork 仓库
2. 创建功能分支（`git checkout -b feature/AmazingFeature`）
3. 提交更改（`git commit -m '添加某个很棒的功能'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 开启 Pull Request

## 🎨 主题来源

本扩展动态加载以下仓库的主题：

- [ilyamixaltik/swagger-themes](https://github.com/ilyamixaltik/swagger-themes)
- [ostranme/swagger-ui-themes](https://github.com/ostranme/swagger-ui-themes)

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Swagger UI](https://github.com/swagger-api/swagger-ui) - 优秀的 API 文档工具
- 主题创作者 [ilyamixaltik/swagger-themes](https://github.com/ilyamixaltik/swagger-themes)
- 主题创作者 [ostranme/swagger-ui-themes](https://github.com/ostranme/swagger-ui-themes)
- 所有帮助改进此扩展的贡献者

## 📞 支持

- **问题反馈**：[GitHub Issues](https://github.com/jiayx/swagger-ui-chrome/issues)
- **讨论交流**：[GitHub Discussions](https://github.com/jiayx/swagger-ui-chrome/discussions)

## 🔄 更新日志

### 版本 1.6
- 保存主题后无需刷新页面即可生效
- 添加更多语言支持

### 版本 1.5
- 迁移到 Manifest V3
- 改进主题管理系统
- 添加本地主题支持
- 增强设置页面 UI/UX
- 更好的错误处理和用户反馈

### 版本 1.4
- 添加多主题支持
- 性能改进

### 版本 1.0
- 初始发布
- 基础 Swagger UI 功能

---

<div align="center">
  由 <a href="https://github.com/jiayx">jiayx</a> 用 ❤️ 制作
</div>
