# claude-code-pet — 维护说明（给 AI 助手和协作者）

Claude Code 输入框上方的女仆桌宠插件。公开仓库，MIT 协议；`assets/` 里的角色图是 AI 生成的，版权另行说明，不在 MIT 范围内。

## 先看这个：哪些文件能改，哪些不能

- **`hooks/register.tsx` 是构建产物，不要直接改它。** 它由维护者本机的模板和构建脚本生成，那些源文件**不在这个仓库里**。在这里改了它，下次维护者本机重新构建就会被覆盖，两边会对不上。
- 代码层面的问题（bug、新功能），请**写成 issue 或在说明里把改动讲清楚**，交给维护者在本机改源码并重新构建，不要直接改 `register.tsx`。
- **可以直接改的：** `README.md`、`CHANGELOG.md`、`docs/` 里的文档、`.gitignore`。
- 不要改版本号、不要打版本标签、不要发布 Release；这些由维护者在本机构建后一起完成。
- `assets/*.webp` 和 `docs/*.png|jpg` 不要替换或新增，除非维护者明确要求。

## 目录

- `hooks/register.tsx`：插件主逻辑（构建产物）
- `hooks/hooks.json`：hooks 入口
- `assets/`：各个姿势的图片（运行时按需读取）
- `types/index.d.ts`：状态类型声明
- `pet.test.ts`：自动化测试
- `.claude-plugin/plugin.json`：插件清单（版本号、作者、协议；由构建脚本生成，不要手改）
- `CHANGELOG.md`、`README.md`：更新记录和说明

## 校验和测试（如果环境里有 Claude Code 命令行）

```bash
claude plugin validate .
```

```bash
claude plugin test .
```

当前共 64 个测试（慢机器上 streak 测试已放宽超时），改动文档不需要跑。没有命令行就如实说“没有运行测试”，不要假装通过。

## 回答问题时要知道的事实

- 在 Claude Code 2.1.286 的桌面端测试过，其他版本没验证过；终端版只在自动化测试里验证过。
- 界面文字目前只有中文。
- 已打开的对话想加载新版，在输入框里输入 `/reload-plugins`，再用 `/pet version` 确认构建版本。
- 5H / 7D 额度来自 Claude Code 提供的数据，账号没有提供时显示 `--`。

## 更新文档的规矩

- 写 README / CHANGELOG 时，只写已经确认的事实；没验证过的要写明“没验证”。
- CHANGELOG 按版本分节，每节分“新增、修复、文档”。

## 公开仓库的底线

- 绝不写入真实姓名、邮箱、本机路径（如盘符、用户目录）、令牌、密码。
- 提交作者使用 GitHub 的 noreply 邮箱，作者名为 Firefade0329。
- 提交信息末尾带 `Co-Authored-By: Claude <noreply@anthropic.com>` 署名行。

## 和用户沟通

- 用中文回复。专业术语可以用英文，并在后面附上中文解释。
- 先说结论，再说细节；不确定的地方直接说“我没验证过”。
- 报告要如实：失败就贴出失败，跳过的步骤要说明跳过了。
- 对外发布内容（推送、发帖、建 Release）前先让用户确认；删除或覆盖文件前先核对目标，范围模糊时先列清单。
