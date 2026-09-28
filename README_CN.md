# Swagger UI Chrome 扩展

<div align="center">
  <img src="src/icons/icon-128.png" alt="Swagger UI Logo" width="128" height="128">

  [![Chrome Web Store](https://img.shields.io/chrome-web-store/v/liacakmdhalagfjlfdofigfoiocghoej)](https://chrome.google.com/webstore/detail/swagger-ui/liacakmdhalagfjlfdofigfoiocghoej)
  [![License](https://img.shields.io/github/license/jiayx/swagger-ui-chrome)](LICENSE)
  [![GitHub Stars](https://img.shields.io/github/stars/jiayx/swagger-ui-chrome?style=social)](https://github.com/jiayx/swagger-ui-chrome)

  [English](README.md) | [简体中文](README_CN.md)
</div>

## 📋 概述

一个强大的 Chrome 扩展，将 Swagger UI 打包成浏览器插件，让您可以直接在浏览器中轻松查看和测试 OpenAPI/Swagger 文档。非常适合需要快速访问 API 文档而不想搭建本地服务器的 API 开发者和测试人员。

## ✨ 功能特点

- 🚀 **即时访问** - 一键查看 Swagger/OpenAPI 文档
- 🎨 **多主题支持** - 使用默认主题，或从两个已配置的 GitHub 仓库选择主题
- 📄 **JSON/YAML 文档** - 加载通过 HTTP/HTTPS 提供的文档；目前不支持直接导入本地文件
- 🔗 **URL 支持** - 从任意 URL 加载 API 文档
- 💾 **持久化设置** - 自动保存您的主题偏好设置
- 🔒 **浏览器扩展** - 使用存储和 HTTP/HTTPS 主机权限加载文档、调用接口

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

2. 安装锁定的依赖并构建：
   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   ```

3. 在 Chrome 中加载扩展：
   - 打开 Chrome 并访问 `chrome://extensions/`
   - 在右上角启用「开发者模式」
   - 点击「加载已解压的扩展程序」
   - 选择项目内的 `dist/extension/` 目录（不是源码目录）

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
4. 点击预览图查看大图，不会切换当前主题
5. 点击「使用主题」应用；也可在当前主题区域点击「恢复默认」

## 🛠️ 开发

### 工作原理

该扩展将 Swagger UI 打包为 Chrome 扩展，架构如下：

1. **Service Worker** (`background.js`)：处理扩展图标点击事件，在新标签页中打开 Swagger UI
2. **Swagger UI 集成**：使用官方 Swagger UI 发行版，配合自定义初始化器
3. **主题系统**：从 GitHub 仓库动态获取并应用 CSS 主题
4. **存储**：使用 Chrome 的存储 API 持久化用户偏好设置（选定的 URL 和主题）
5. **Manifest V3**：符合 Chrome 最新的扩展架构，提供更好的安全性和性能

### 前置要求

- Node.js 24+、pnpm 12.3.4
- Chrome 浏览器

### 项目结构

```
swagger-ui-chrome/
├── src/                         # 自有扩展源码，结构直接对应安装包
│   ├── manifest.json            # 浏览器要求的扩展清单
│   ├── background.js            # 工具栏点击入口
│   ├── _locales/                # Chrome 规定的多语言目录
│   ├── icons/                   # 扩展和页面共用的品牌图标
│   ├── options/                 # 设置功能的完整实现
│   │   ├── index.html
│   │   ├── options.css
│   │   ├── options.js
│   │   └── default-theme.png    # 仅设置页使用的预览图
│   └── viewer/                  # 接口浏览、执行与授权
│       ├── index.html
│       ├── viewer.css
│       ├── viewer.js
│       ├── oauth2-redirect.html
│       └── oauth2-redirect.js
├── scripts/                     # Node 开发工具，不打进扩展
│   ├── build.mjs                # 组装并生成 ZIP
│   ├── check.mjs                # 校验与测试入口
│   ├── check-extension.mjs      # 清单、资源引用、多语言校验
│   └── preview/                 # 本地服务器、示例 API、Chrome API 模拟
├── tests/                       # 运行逻辑、构建、预览回归测试
├── package.json
├── pnpm-lock.yaml
├── node_modules/                # 安装的第三方依赖，不进入 Git
└── dist/                        # 生成产物，不进入 Git
    ├── extension/               # Chrome 加载此目录
    │   ├── …                    # src/ 的同路径副本
    │   └── vendor/swagger-ui/   # 构建时提取的第三方 JS、CSS、许可证
    └── swagger-ui-chrome-v*.zip  # 商店安装包
```

目录按维护边界划分：同一功能的 HTML、CSS、JS 和专用图片放在一起，公共目录只保留确实共用的图标。单个后台入口直接放根部；不为一个文件增加层级，也不预建空的 `components/`、`services/` 或 `utils/`。开发工具和测试独立于运行源码。

构建保留 `src/` 内的相对路径，不重写源码引用、不维护额外的路径映射。`vendor/` 只属于构建产物，不能在 `src/` 中手工添加第三方文件。源码缺少这些依赖资源，Chrome 必须加载 `dist/extension/`。


### 本地开发与打包

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm preview
```

`pnpm build` 从已安装的 `swagger-ui-dist` 中复制所需资源，与自有源码组装，不联网下载或自动升级。缺少依赖或版本不一致时会报错。构建先在临时目录校验，通过后替换输出；失败时保留上次成功产物。相同输入生成相同 ZIP。构建、校验、测试和预览全部由 Node.js 运行。

开发时修改 `src/`，重新执行 `pnpm build`，再刷新扩展及其页面。不要编辑 `dist/extension/`，下次构建会覆盖。预览读取构建产物：打开 `http://127.0.0.1:8765/options/index.html?lang=zh_CN`。预览的 Chrome API 是浏览器存储模拟，不能代替实际扩展权限测试。

主题 CSS 仍从配置的 GitHub 仓库动态加载。已有主题和主题列表在本地缓存；恢复默认会同步到已打开的文档页。文档 URL 仅在本地保存，旧同步 URL 成功迁移后会从同步存储移除。

### 升级 Swagger UI

当前固定 `swagger-ui-dist` **5.33.0**。升级时明确指定目标版本：

```bash
pnpm add --save-exact swagger-ui-dist@<version>
pnpm check
pnpm build
```

提交自己的代码、`package.json`、`pnpm-lock.yaml` 和构建配置；不提交下载的 JS/CSS 或安装包。

### Swagger UI 适配边界

构建只从依赖提取核心 JS、基础 CSS、图标及许可证文件。上游入口和 OAuth 回调不会覆盖扩展自己的实现。预览页 HTML、样式、初始化和 OAuth 回调统一位于 `src/viewer/`。构建直接复制源码目录结构，第三方资源单独放在 `vendor/swagger-ui/`。OAuth 回调路径现为 `viewer/oauth2-redirect.html`；如果服务商配置过旧回调路径的白名单，需要同步更新。Swagger 公共远程校验已关闭。

构建产物中的 `vendor/swagger-ui/upstream.json` 记录 npm 包名、版本和锁文件来源；精确的下载完整性信息以 `pnpm-lock.yaml` 为准。

本地预览提供 **local-test → Basic Auth** 接口，测试账号 `demo / demo`，请求仅发往本机。升级后检查文档加载、主题切换、Try it out、授权弹窗及真实 OAuth 回调；Chrome 扩展权限和真实服务商登录仍需实际扩展环境验证。

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
