# 参与贡献 / Contributing

*English summary: please open an issue for bugs and ideas. `hooks/register.tsx` is a build artifact generated from files that are not in this repository, so code changes should start as an issue, not as a pull request against that file. Documentation fixes are welcome as pull requests.*

这是一个个人维护的小项目，欢迎反馈问题和提出想法。下面是怎么参与最省事。

## 反馈问题

1. 先在 [Issues](../../issues) 里搜一下有没有人报告过。
2. 新建 Issue，选 **Bug 反馈** 模板。请尽量填全：
   - Claude Code 的版本（运行 `claude --version`）；
   - 桌宠的版本（在 Claude Code 输入框里输入 `/pet version`）；
   - 用的是桌面端 Code 标签页、终端，还是别的界面；
   - 操作系统和版本；
   - 怎么复现（一步一步写）；
   - 相关的报错或输出（没有就写"无"）。
3. **不要贴个人信息**：用户名、电脑名、本机路径、令牌、对话内容、不想公开的截图。贴之前请自己检查一遍。

想法和建议请选 **功能建议** 模板。

## 提交改动

### 先看这个：`hooks/register.tsx` 是构建产物

`hooks/register.tsx` **不是手写的源码**。它由维护者本机的模板和构建脚本生成，这些源文件**不在这个仓库里**。如果有人直接改它，下次维护者重新构建时就会被覆盖，两边会对不上。

所以：

- **代码层面的贡献（bug、新功能）请先开 Issue 说明**：写清楚问题在哪（尽量指出 `hooks/register.tsx` 的行号）、你期望的行为、怎么复现。维护者会在本机改源码并重新构建。
- **请不要提交直接修改 `hooks/register.tsx` 的 Pull Request。**
- 同样不要直接改：`.claude-plugin/plugin.json`（由构建脚本生成，里面有版本号）、`assets/` 里的图片、`docs/` 里的截图。也不要改版本号、不要打标签、不要发布 Release，这些由维护者在本机构建后一起完成。

### 欢迎直接提 Pull Request 的内容

- `README.md`、`docs/` 里的文档的错字、过时说明、补充；
- `.gitignore` 的小修正。

`CHANGELOG.md` 按版本记录，通常由维护者随发布更新；如果你发现它有错，直接在 Issue 或 PR 里说明即可。

写文档时请只写已经确认的事实；没验证过的内容请明确写"未验证"。

### 测试

只改文档不需要跑测试。如果你有 Claude Code 命令行，可以在仓库根目录运行：

```bash
claude plugin validate .
claude plugin test .
```

测试个数以实际输出为准。个别测试在比较慢的机器上可能因默认的 5 秒超时而失败（已知情况，不一定是你的改动造成的）。没有命令行就如实说"没有运行测试"，不要写成"已通过"。

### 隐私和素材

- 提交、Issue、PR、截图里**不要出现**真实姓名、邮箱、本机路径（盘符、用户目录）、令牌、密码。
- 不要提交第三方的素材、参考图或截图。截图只能用本项目自己的画面，并且去掉 EXIF 元数据。
- `assets/` 里的角色图是 AI 生成的，不在 MIT 协议的范围内（见 [README](README.md#许可--license)）。请不要替换或新增这些图片，除非维护者明确要求。

## 许可

提交的代码和文档按本仓库的 [MIT License](LICENSE) 授权。

## 说明

这是个人项目，没有固定的响应时间，也不保证采纳每一个建议。感谢你花时间反馈。
