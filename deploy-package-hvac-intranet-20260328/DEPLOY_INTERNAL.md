# 内网部署说明

## 运行方式

当前部署包采用“单服务部署”：

- `FastAPI` 提供后端接口
- 同一个 `FastAPI` 进程直接托管前端 `dist`
- 浏览器直接访问 `http://服务器IP:3001/`

这样部署时不需要前端开发服务器，也不需要 Node.js。

## 服务器前置条件

- Windows Server 或 Windows 主机
- Python `3.11+`
- 可执行 `pip install -r requirements-server.txt`
- 允许内网访问 `3001` 端口

## 部署步骤

1. 解压部署包到目标目录，例如 `D:\hvac-design-master`
2. 在该目录执行：

```bat
python -m pip install -r requirements-server.txt
```

3. 双击：

```bat
start_intranet_server.bat
```

4. 浏览器访问：

```text
http://服务器IP:3001/
```

## 部署包内关键文件

- `dist/`：前端构建产物
- `server/app.py`：后端主程序
- `server/hvac.db`：SQLite 数据库
- `server/uploads/`：已上传文件
- `server/.env`：JWT 和端口配置
- `requirements-server.txt`：Python 依赖
- `start_intranet_server.bat`：启动脚本

## 默认账号

- `admin / 123456`
- `user1 / 123456`
- `user2 / 123456`
- `user3 / 123456`

## 注意事项

- 如果需要保留当前项目数据，必须同时保留 `server/hvac.db` 和 `server/uploads/`
- 如果只想部署一个全新空库版本，也可以替换 `server/hvac.db`
- 当前前端接口使用相对路径 `/api`，因此必须通过本包的单服务方式部署，或由 IIS/Nginx 做同源反向代理
