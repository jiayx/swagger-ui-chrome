# Swagger UI Chrome Extension

[English](README.md) | 简体中文

在 Chrome 中查看 OpenAPI/Swagger 文档、调用接口，并自定义文档页面主题。

## 功能

- 通过 HTTP/HTTPS URL 加载 JSON、YAML 文档，使用 Swagger UI 浏览和测试接口。
- 使用文档定义的认证方式，包括 Basic Auth 和 OAuth。
- 搜索、筛选和预览 GitHub 社区主题，应用主题或恢复默认；主题变更同步到已打开的文档页。
- 在本机保存文档 URL、主题 CSS 和主题列表缓存。
- 界面语言跟随 Chrome，支持简体中文、英语、西班牙语、印地语、日语、韩语、俄语。

主题来源：[ilyamixaltik/swagger-themes](https://github.com/ilyamixaltik/swagger-themes)、[ostranme/swagger-ui-themes](https://github.com/ostranme/swagger-ui-themes)。

## 安装与使用

从 [Chrome 网上应用店](https://chromewebstore.google.com/detail/swagger-ui/liacakmdhalagfjlfdofigfoiocghoej) 安装。

点击工具栏的扩展图标，输入文档 URL，点击 **Explore**。右键扩展图标，选择「选项」进入主题设置。点击主题截图可查看预览，点击「使用主题」应用。

扩展使用 `storage` 权限保存偏好，以及 HTTP/HTTPS 主机权限加载文档和调用接口。文档 URL 不发送给 Swagger 公共校验服务。OAuth 服务商的回调地址应配置为 `chrome-extension://<扩展 ID>/viewer/oauth2-redirect.html`。

## 本地开发

需要 Node.js 24+、pnpm 12.3.4 和 Chrome。

```sh
git clone https://github.com/jiayx/swagger-ui-chrome.git
cd swagger-ui-chrome
pnpm install --frozen-lockfile
pnpm build
```

打开 `chrome://extensions/`，启用开发者模式，点击「加载已解压的扩展程序」，选择 **`dist/extension/`**。

| 命令 | 用途 |
| --- | --- |
| `pnpm build` | 组装扩展并生成商店 ZIP |
| `pnpm check` | 构建、语法检查和回归测试 |
| `pnpm preview` | 构建并启动本地预览 |

修改源码后重新构建，再刷新 Chrome 中的扩展和页面。

本地预览地址：

- 接口页面：`http://127.0.0.1:8765/viewer/index.html`
- 中文设置页：`http://127.0.0.1:8765/options/index.html?lang=zh_CN`

预览通过模拟 Chrome API 使用浏览器本地存储，并提供 `demo / demo` 的本机 Basic Auth 示例。扩展权限和真实 OAuth 登录需要在 Chrome 扩展中验证。

## 项目结构

```text
src/
├── manifest.json       # 扩展清单
├── background.js       # 工具栏入口
├── _locales/           # 多语言
├── icons/              # 共用图标
├── options/            # 设置页及专用资源
└── viewer/             # 文档页面、初始化和 OAuth 回调
scripts/                # Node 构建、校验和本地预览工具
tests/                  # 功能及构建回归测试
dist/
├── extension/          # Chrome 加载目录
└── swagger-ui-chrome-v*.zip
```

构建保留 `src/` 的相对路径，将 `swagger-ui-dist` 的所需资源和许可证复制到产物的 `vendor/swagger-ui/`。依赖版本由 `package.json` 和 `pnpm-lock.yaml` 固定。`node_modules/` 和 `dist/` 不提交 Git。

## 打包发布

在 `src/manifest.json` 设置扩展版本，执行 `pnpm check`，将 `dist/swagger-ui-chrome-v<版本>.zip` 上传至 Chrome 商店开发者后台。

升级 Swagger UI 依赖：

```sh
pnpm add --save-exact swagger-ui-dist@<版本>
pnpm check
```

## 许可证与反馈

[MIT](LICENSE)。第三方组件保留各自许可证。问题请提交至 [GitHub Issues](https://github.com/jiayx/swagger-ui-chrome/issues)。
