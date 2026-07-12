<p align="center"><img src="main/logo.png" width="80" alt="SeaScribe"></p>

# SeaScribe

> 课堂听写投屏系统 — 教师大屏随机出题，学生纸笔作答，一键公布答案
>
> by **谦虚の海鸥** · v4.3.1 · [GitHub](https://github.com/qxdho/SeaScribe)

---

## 快速开始

```
双击 index.html 即可打开主站；学科数据加载需通过 HTTP 服务器（见下方）
```

或一键启动（自动开浏览器）：

```
双击 start.bat
```

部署到服务器：

```
python server.py 9360
```

访问 `http://服务器IP:9360`

管理后台：`http://服务器IP:9360/admin/`（默认账号 `admin` / `admin123`）

---

## 功能

### 主站
- **随机出题**：选中学科，设定数量，一键出题
- **公布答案**：一键展开/隐藏答案卡片
- **布局切换**：网格方阵 / 列表横向，可调列数和字号
- **随机点名**：三种随机算法（纯随机/二分法/时间加权），双层动画，头像展示，防重复点名
- **深色模式**：`🌙`/`☀️` 一键切换
- **插件化**：`plugins/` 下每学科独立文件夹，复制模板即可扩展

### 管理后台
- **用户系统**：三种角色（管理员/教师/学生），PBKDF2 密码哈希，HttpOnly + Bearer 双通道鉴权
- **自助注册**：学生自主注册账号（用户名+昵称+密码），实时表单校验，注册后自动绑定姓名
- **姓名池**：班级学生统一管理，行内编辑，CSV 批量导入，签名双向同步
- **点名记录**：查看/清空/逐条删除各班级点名时间戳
- **个人资料**：头像上传，班级显示，上次点名时间查询
- **用户管理**：表格排序，筛选栏展开/收起
- **移动端适配**：手机/平板全界面可用
- **主题切换**：浅色/深色模式，与主站同步，刷新不闪烁
- **Hash 路由**：`/admin/#/users` 直达页面，`#/login`/`#/register` 直达登录/注册

### 学科插件

| 学科 | 特点 |
|------|------|
| **化学** | 价层电子式 + 轨道式，H~Kr 36 元素，CSV 可编辑 |
| **英语** | xlsx/csv 导入，可调听写列/答案列，管理后台上传 |

---

## 目录结构

```
├── index.html                  主站 SPA
├── server.py                   多线程 Python 服务器
├── start.bat                   一键启动
├── UPDATE.md                   更新日志
├── PLUGINS.md                  插件扩展指南
├── RULES.md                    编码规范
│
├── admin/                      管理后台 SPA
│   ├── index.html
│   ├── css/                    7 文件：base / login / layout / components / config / responsive + 复用 ../main/css/theme.css
│   └── js/
│       ├── common.js           API / session / toast / 主题切换
│       ├── router.js           PageRegistry 路由 + hash
│       ├── auth.js             登录 / 登出 / 绑定姓名
│       ├── app.js              入口
│       └── pages/              6 页面：profile / users / config / files / records / roster
│
├── main/                       主站资源
│   ├── logo.png / logo.svg
│   ├── css/                    11 文件，按职责拆分（含 shared theme.css + picker.css）
│   └── js/                     13 文件 + picker/ 点名子模块
│
├── config/                     主站 JS 配置
│   ├── config.js
│   ├── picker/config.js
│   ├── chemistry/config.js
│   └── english/config.js
│
├── plugins/                    学科插件
│   ├── _template/
│   ├── chemistry/
│   └── english/
│
└── archive/                    旧版归档 v1.0 / v2.0
```

> `admin/_store/` 和 `data/` 目录不入库（含用户数据、学生名单、点名时间戳等隐私信息）

---

## 学生管理

学生姓名和签名统一在管理后台「姓名池」管理，按班级分文件存储：

```
admin/_store/roster/
├── 11班.json    [{name:"张三",signature:"班长"}, ...]
└── 12班.json    [{name:"李四",signature:"学习委员"}, ...]
```

- 管理员可增删改学生、CSV 批量导入
- 学生首次登录绑定姓名，签名从姓名池同步
- 学生可在资料页修改个性签名，双向同步到姓名池
- 点名系统直接读取姓名池，不再依赖 CSV 文件

---

## 添加新学科

参见 **[PLUGINS.md](./PLUGINS.md)**

---

## 投屏建议

| 屏幕分辨率 | 推荐列数 | 推荐字号 | 推荐数量 |
|-----------|---------|---------|---------|
| 1024×768 | 3 | 100% | 12 |
| 1920×1080 | 4 | 120% | 16 |
| ≥2560 | 5 | 140% | 20 |

---

## 技术栈

HTML5 + CSS3 + Vanilla JS · Python stdlib 多线程服务器 · PBKDF2 密码哈希 · HttpOnly + Bearer 鉴权

## License

MIT
