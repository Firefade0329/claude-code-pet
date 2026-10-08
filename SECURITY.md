# 安全政策 / Security Policy

*English summary: please report security problems privately through GitHub's "Report a vulnerability" (Security tab), not in a public issue. Below is what this plugin reads, writes and whether it uses the network, taken from the code.*

## 支持的版本

只维护最新发布的版本。请先确认问题在最新版里仍然存在（在 Claude Code 里输入 `/pet version` 查看当前版本）。

## 怎么私下报告安全问题

请**不要**在公开的 Issue 里写漏洞细节。

1. 在本仓库页面打开 **Security** 标签页，点 **Report a vulnerability**（GitHub 的私下漏洞报告功能），按提示填写。
2. 如果你没有看到这个入口（说明维护者还没有启用它），请新建一个 Issue，标题写"想私下报告一个安全问题"，**正文不要写任何细节**，维护者看到后会给出私下联系的办法。

请在报告里写明：影响了什么、怎么复现、涉及的版本（Claude Code 版本和桌宠版本）。**不要**在报告里放个人信息、令牌或真实的对话内容。

这是个人项目，没有固定的响应时间，但会尽力处理。

以下问题请不要报告到这里：Claude Code 本身、Claude 桌面应用或 Anthropic 服务的安全问题，请通过 Anthropic 的官方渠道报告。

## 这个插件读写什么（以代码为准）

下面的内容来自我对 `hooks/register.tsx` 的逐行阅读，以及 `claude plugin validate .` 列出的插件接口调用。构建产物里没有别的数据访问。

### 联网

**不联网。** 代码里没有任何网络请求；它只通过 Claude Code 提供的插件接口（`$.`）工作。该插件没有第三方依赖，只引用 Claude Code 的类型。

### 读取的数据

- **自己的图片**：`assets/<姿势>.webp`，通过 `$.fs.read` 读取，只读插件自己目录下的这些文件。
- **Claude Code 提供的用量数据**：上下文百分比、5 小时 / 7 天额度的使用百分比和重置时间、本会话花费、各类 token 数量（用来算缓存命中率）。这些数据本来就由 Claude Code 提供给插件。
- **对话状态的事件**：一轮开始 / 结束（用到是否出错、耗时、token 数）、工具调用（只看工具名是不是 `AskUserQuestion`，并统计次数）、权限请求（只用来切换"等你确认"的姿势）、压缩上下文的开始和结束。**不读取你输入的提示词、模型的回答、工具的参数和输出。**
- **输入框的内容**：点"压缩上下文"按钮时，通过 `$.prompt.read()` 读一下输入框里是否已经有字（只为了避免覆盖你的草稿），**不保存、不上传**。

### 写入的数据

- **插件存档**（`$.store`，由 Claude Code 保存在你本机，所有对话共用）：好感度、已解锁的成就、累计统计（轮数、工具调用次数、摸头次数、番茄钟个数、最长一轮耗时等计数）、连续使用天数和日期、今天的计数、5H / 7D 额度的使用百分比和重置时间（用来在重启后先显示上次的值）、缓存命中率，以及两个防重复的标记（`warned5`、`dayClaim`）。**里面没有对话内容、提示词、文件路径。** README 里写的存档位置是 `~/.claude/plugins/store/`，我没有在所有版本上验证过，实际位置由 Claude Code 决定。想重置，删除该存档文件即可。
- **输入框**：只在你点"压缩上下文"、且输入框是空的时，往里填 `/compact `，**不会自动发送**。
- 界面上的弹出提示和 `/pet` 命令的返回文字。

### 不做的事

- 不读写你的项目文件（除了自己 `assets/` 里的图片）；
- 不执行 shell 命令；
- 不修改 Claude Code 的设置；
- 不收集或上传任何数据。

### 需要注意的

- `hooks/register.tsx` 是构建产物，内嵌了几张图片的 base64 数据，不太适合逐行审阅。想核对行为的话，可以对照 `claude plugin validate .` 列出的接口调用清单。
- 作为 Claude Code 的插件，它在 Claude Code 的进程里运行。我没有验证 Claude Code 对插件有没有额外的沙箱限制，所以请只安装你信任的插件，包括这一个。
