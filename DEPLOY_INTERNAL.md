# 内网部署说明

## 运行方式

当前采用“单服务部署”：

- `FastAPI` 提供后端接口
- 同一个 `FastAPI` 进程直接托管前端 `dist`
- 浏览器直接访问 `http://服务器IP:3001/`

这样部署时不需要前端开发服务器，也不需要 Node.js。

## 服务器前置条件

- Windows Server 或 Windows 主机
- Python `3.11+`
- 可执行 `pip install -r requirements-server.txt`
- 允许内网访问 `3001` 端口

## 首次部署初始化（重要）

仓库里**不包含** `server/.env` 和 `server/*.db`，这是有意设计的：密钥不能进代码仓库，数据库由程序首次启动自动生成。

1. 复制示例配置并修改密钥：

```bat
copy server\.env.example server\.env
```

   打开 `server/.env`，把 `JWT_SECRET` 改成自己的随机字符串。同一台服务器重启时必须保持同一个值，否则已登录用户会失效。

2. 安装依赖并首次启动后端，程序会自动建表并创建默认账号：

```bat
python -m pip install -r requirements-server.txt
python -m uvicorn app:app --host 127.0.0.1 --port 3001
```

   注意后端需从 `server` 目录启动（或在项目根用 `server.app:app` 时确保 `server` 在模块路径中），否则可能找不到 `pdf_text_extractor`。

3. 首次启动后会生成 `server/hvac.db` 和 `server/accounts.db`，这两个文件含项目数据和账号密码哈希，**不要提交到 Git**，也不要在公开渠道传播。

4. 如需把域账号方案落地（域账号即用户名、域密码即密码），由管理员维护部门域账号名单并按项目/子项授权；本平台不另存密码。

5. 访问 `http://服务器IP:3001/`（内网 HTTP，非安全上下文；如需浏览器选择本机目录，请实测 `webkitdirectory` 是否可用）。

## 代码仓库包含什么

- `src/`、`index.html`、`package.json`：前端源码与构建配置；`dist/` 由本地构建生成，不入库
- `server/app.py` 等 Python 源码：后端主程序与 PDF 提取等辅助模块
- `server/.env.example`：环境变量示例；真实 `server/.env` 不入库
- `GB/`：规范全文 PDF（规范查阅功能依赖）
- `requirements-server.txt`、`environment.yml`：Python 依赖
- `start_all.bat` + `start_backend_worker.bat` + `start_frontend_worker.bat`：本机一键启动
- 需求说明书、README、方案/审计/演示网页、轮次日志：需求与讨论记录

## 默认账号

程序首次启动自动创建：`admin / 123456`、`user1 / 123456`、`user2 / 123456`、`user3 / 123456`。正式使用前请修改密码，或按上一步接入域账号方案。

## 注意事项

- 如需保留当前项目数据，必须同时保留 `server/hvac.db`、`server/accounts.db` 和 `server/uploads/`；升级时先备份这三个路径
- 换一台机器部署时，不复制数据库即可得到全新空库，默认账号会自动重建
- 当前前端接口使用相对路径 `/api`，因此必须通过本包的单服务方式部署，或由 IIS/Nginx 做同源反向代理
- 部署包、旧快照、编辑器缓存等中间产物保存在本地 `archive/整理归档-2026-11-17/`，不进入 Git
