# ⚠️ 编码注意事项

> 每次修改代码前必须阅读本文档，避免重复犯同样的错误。

---

## 1. 路径管理

- 移动文件后**必须**更新所有 `src`、`href`、`fetch` 路径
- `server.py` 不要 `os.chdir` 到子目录，从根目录提供服务
- 部署时用户上传的是目录**内容**，不含外层文件夹名

## 2. 文件重写检查清单

用 `write_file` 重写整个文件后，逐项确认：

- [ ] 所有 `addEventListener` 都在
- [ ] HTML `id` 和 JS `getElementById` 一致
- [ ] `src`/`href` 路径正确

## 3. 配置规则

- JS 中**零硬编码兜底**（不允许 `|| 4`、`|| 2`、`|| 12`）
- 配置项命名规范：`gridColumns`/`listColumns`、`gridFontSize`/`listFontSize`
- 每个模式的列数和字号独立存储和恢复

## 4. 全局替换

- **禁用** PowerShell `-replace` 做全局正则替换（可能破坏注释、合并行、损坏 Unicode）
- 必须用 `edit_file` 做精准替换

## 5. 不执行未知脚本

- 第三方配对/安装脚本需要对应运行时环境
- 不在 SeaScribe 项目中执行与项目无关的命令
