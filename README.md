<p align="center"><img src="main/logo.png" width="80" alt="SeaScribe"></p>

# SeaScribe

> 课堂听写投屏系统 — 教师大屏随机出题，学生纸笔作答，一键公布答案
>
> by **谦虚の海鸥** · v4.7.0 · [GitHub](https://github.com/qxdho/SeaScribe)

---

## 快速开始

| 方式 | 命令 |
|------|------|
| 本地使用 | 双击 `index.html` → 选择学科 → 随机出题 |
| 一键启动 | 双击 `start.bat`（需安装 Python） |
| 服务器部署 | `python3 main/server.py 9360` |

管理后台：`/admin/`（默认 `admin` / `admin123`）

---

## 功能

### 主站
| 功能 | 说明 |
|------|------|
| 随机出题 | 选学科、设数量，一键生成卡片 |
| 公布答案 | 一键展开/隐藏所有答案 |
| 布局切换 | 网格方阵 / 列表横向，列数 1-6、字号 60%-200% 无极调节 |
| 随机点名 | 纯随机 / 二分法 / 时间加权，全屏动画 + 头像 + 彩带 |
| 调试动画 | 指定姓名直接播放动画，无需真实点名 |
| 深色模式 | 🌙/☀️ 一键切换，刷新不闪烁 |

### 管理后台
| 功能 | 说明 |
|------|------|
| 用户系统 | 管理员/教师/学生，PBKDF2 密码哈希 + 双通道鉴权 |
| 自助注册 | 学生自主注册，实时表单校验，注册后自动绑定姓名 |
| 姓名池 | 按班级管理，行内编辑、CSV 批量导入 |
| 设备管理 | 查看活跃会话，强制退出指定设备 |
| 操作日志 | 记录登录/修改/删除等操作，可按类型筛选 |
| 个人资料 | 头像上传、班级显示、上次点名时间 |
| 文件管理 | 英语 xlsx/csv 上传，服务器端存储 |

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | HTML5 + CSS3 + Vanilla JS，零框架 SPA，CSS 设计令牌体系 |
| 后端 | Python 标准库 `http.server` + `ThreadingMixIn`，模块化 `main/server/` 包 |
| 鉴权 | PBKDF2-HMAC-SHA256 · HttpOnly Cookie + Bearer Token |
| 存储 | JSON 文件（全部在 `data/` 不入库） |

---

## 目录结构

```
├── main/                    所有项目代码
│   ├── server.py            服务器入口
│   ├── server/              后端模块包
│   │   ├── config.py        常量配置
│   │   ├── auth.py          鉴权·用户·会话·操作日志
│   │   └── routes.py        API 路由（18 GET + 16 POST）
│   ├── admin/               管理后台 SPA
│   │   ├── css/             6 文件
│   │   └── js/              路由/鉴权 + pages/ 8 页面
│   └── client/              主站前端资源（原 main/）
│       ├── css/             11 文件
│       ├── js/              核心模块 + picker/ 点名子模块
│       └── logo.png
│
├── config/                  JS 配置（主站·点名·化学·英语）
│   └── */config.js          window._CONF.{namespace}
├── plugins/                 学科插件（_template / chemistry / english）
├── data/                    所有运行时数据（users/t/sessions/avatars/roster/picker/学科）
├── index.html               主站 SPA
├── start.bat / start.sh     启动脚本
├── README.md · UPDATE.md · PLUGINS.md · RULES.md
```
