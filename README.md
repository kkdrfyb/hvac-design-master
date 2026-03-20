<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 暖通设计管家（HVAC Design Assistant）

本项目为暖通设计过程记录与模板化管理工具，当前实现 V1 规划中的**文件分类模板、阶段管理、极简执行视图与完成度展示**等能力，强调“记录对、存完整、找得到”。

> V1 不做规范自动判断或文件内容解析，仅提供结构化记录与阶段推进支撑。

## 功能概览

- 项目/子项创建：选择子项类型与当前阶段，按模板启用分类。
- 阶段切换：单向推进，历史阶段只读可见。
- 极简执行视图：每阶段 3–5 项关键执行条目。
- 分类完成度：按一级分类统计当前阶段完成比例。

## 本地运行

前置条件：`Conda`（推荐）或系统 Python + Node.js

### 方式一：Conda（推荐，不使用系统 Python）

1. 创建或更新环境：
   - 首次：`conda env create -f environment.yml`
   - 已有环境：`conda env update -n hvac-design -f environment.yml --prune`
2. 安装前端依赖：
   `conda run -n hvac-design npm install`
3. 启动后端（FastAPI，端口 `3001`）：
   `conda run --no-capture-output -n hvac-design uvicorn app:app --app-dir server --host 0.0.0.0 --port 3001`
4. 启动前端（Vite，默认端口 `3000`）：
   `conda run --no-capture-output -n hvac-design npm run dev`

### 方式二：系统环境（不使用 conda）

1. 安装前端依赖：`npm install`
2. 启动后端（Python 3.11+）：`uvicorn app:app --app-dir server --host 0.0.0.0 --port 3001`
3. 启动前端：`npm run dev`

### 一键启动

直接运行 `start_all.bat`：
- 自动检查 conda 环境 `hvac-design`（不存在会创建，存在会更新依赖）
- 自动解析 conda 环境路径，并直接调用该环境内 `python.exe` 与 `npm.cmd`
- 自动检查前端依赖（`node_modules` 不存在会安装）
- 启动后端（3001）和前端（3000）两个窗口
- 默认自动打开浏览器到 `http://localhost:3000/`
- 脚本输出为英文（已改为纯 ASCII，避免中文编码导致 bat 解析异常）

如不想每次都更新 conda 依赖，可在执行前设置：
`set SKIP_ENV_UPDATE=1`

如不希望脚本自动打开浏览器，可设置：
`set SKIP_AUTO_OPEN=1`

## 登录与测试账号

系统启动时会自动校准测试账号（不存在会创建，存在会重置为默认密码）：
- `admin`（管理员）
- `user1`
- `user2`
- `user3`

默认密码统一为：`123456`

### 登录报错排查

- `Authentication failed` / `Failed to fetch`
  - 通常是后端未启动成功，先查看 `HVAC Backend` 窗口日志。
  - 确认后端地址：`http://localhost:3001`
- `Invalid credentials`
  - 账号或密码错误，可先用 `user1 / 123456` 测试。
  - 也可在登录页底部点击“快速切换测试账户”自动登录。

### bat 乱码/命令无法识别排查

如果运行 `start_all.bat` 出现类似：
- `'xxx' 不是内部或外部命令`
- 输出乱码（如 `曡繍...`）

通常是 bat 编码被改坏或不是最新脚本。处理方式：
1. 用仓库当前版本覆盖 `start_all.bat`（本项目已改为纯 ASCII 版本）。
2. 不要在 bat 中加入中文字符（会触发部分 Windows 环境下的编码解析问题）。
3. 在 `cmd` 中进入项目根目录后再执行：`start_all.bat`。
4. 如果窗口停在 `[1/4] Checking conda environment`，通常是旧脚本里调用 conda 未使用 `call`；
   请使用仓库当前版本 `start_all.bat`。
5. 如果前端窗口报错包含 `__conda_tmp_xxx.txt`、`Failed to run conda activate`：
   - 这是 `conda run` 在 Windows 上的临时文件冲突问题；
   - 当前脚本已绕开该问题（直接调用环境内 `npm.cmd`），请确保你运行的是最新脚本。
