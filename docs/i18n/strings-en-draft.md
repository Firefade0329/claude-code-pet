# Pet UI strings — English draft

> 这是**草稿**，用于预研：没有经过母语者校对，也没有放进代码里试过。中文原文见 [strings-zh.md](strings-zh.md)，编号一一对应。
> 语气：阶段 0 正式恭敬（"Master"、"Please…"、"I will…"）；阶段 1 俏皮、爱撒娇（缩写、感叹号、`~`）；阶段 2 温柔亲昵（直接用 "you"，不再称呼 "Master"）。
> 占位符 `{m}`、`{l}`、`{a}`、`{n}` 与中文完全一致（我用脚本核对过：每一句的占位符集合和中文相同；每个类别每个阶段的句数也相同——**已确认**）。
> 约定：不用复数变化（"{m} min"）；`{n}` 天只在 n ≥ 2 时出现，所以 "{n} days" 不会出现 "1 days"，其它位置见各表备注。"她" 译成 "her"，因为原文指的是这个女仆角色。"番茄钟" 译成 "pomodoro"（成就描述里首次出现时带 "focus timer"）。

## 需要你决定的事

### 1. "主人" 暂时统一用 "Master"（待你决定）

这次草稿里"主人"全部译成了 "Master"，没有做其它处理。我数过：中文里"主人"出现在阶段 0 的 43/87 句、阶段 1 的 5/87 句，阶段 2 一句都没有（阶段 2 用的是"你"）。所以这个选择只影响阶段 0 和阶段 1 的 48 句。备选做法：

| 选项 | 阶段 0 | 阶段 1 | 优点 | 缺点 |
|---|---|---|---|---|
| **A. Master（本草稿）** | Master | Master | 最直接，保留"女仆与主人"的设定；英文里的 maid 题材很常见 | 有些读者会觉得有等级 / 性别色彩；对不熟悉这个梗的人有点突兀 |
| B. 可配置称呼 | 默认 Master，另提供 `Master / Boss / Sir/Ma'am / 自定义名字` | 同左 | 读者自己选 | 要新增一个选项和占位符 `{call}`，每句都要改成带占位符 |
| C. 阶段 0 用 Master，阶段 1 起改成直接用 "you" 或昵称 | Master | you | 与中文的"阶段越高越亲近"一致 | 阶段 1 会少 5 句里的称呼俏皮感 |
| D. 完全不称呼 | （直接省略） | （省略） | 中性 | 阶段 0 的恭敬感会弱很多 |

我的倾向是 **A 先做，B 作为以后的增强**，但这是你的设计决定。

### 2. 其它我自己做的取舍

- "番茄钟 / 番茄" 译成 `pomodoro`，按钮里缩成 `pomo`（空间有限）。也可以统一叫 "focus timer / session"。
- "好感度" 译成 `Affection`，"成就" 译成 `Achievements`，"桌宠" 译成 `Pet`。
- 成就名称是意译（例如 "千锤百炼" → "Well Tempered"，"满月之约" → "Full-Moon Promise"），保留了意象但不是字面翻译。
- 句子里原有的 "～"、"……"、"（脸红）" 分别保留为 `~`、`…`、`(blushes)`。

## 1. 台词表 `T`


### `idle`

| 编号 | 中文 | English |
|---|---|---|
| T.idle.0.1 | 随时听候吩咐，主人。 | At your service whenever you need me, Master. |
| T.idle.0.2 | 主人，需要我做什么吗？ | Is there anything I can do for you, Master? |
| T.idle.0.3 | 我在这里，请吩咐。 | I'm here. Please give me your instructions. |
| T.idle.0.4 | 请问接下来有什么安排，主人？ | What shall we do next, Master? |
| T.idle.0.5 | 茶水已备好，主人请慢用。 | Your tea is ready, Master. Please enjoy. |
| T.idle.0.6 | 您的事务，我随时待命。 | I stand ready for your affairs at any time. |
| T.idle.0.7 | 需要整理什么的话，请告诉我。 | If there is anything to tidy up, please let me know. |
| T.idle.0.8 | 主人，今天也请多多指教。 | Master, I look forward to working with you again today. |
| T.idle.1.1 | 今天也在这儿待命～ | On standby again today~ |
| T.idle.1.2 | 主人，有什么好玩的任务吗？ | Master, any fun jobs for me? |
| T.idle.1.3 | 喝口水再继续吧？我先看着。 | Have a sip of water before you continue? I'll keep watch. |
| T.idle.1.4 | 有点无聊呢，快给我派点活儿～ | I'm getting a bit bored. Give me something to do~ |
| T.idle.1.5 | 我把桌面收拾好啦，夸夸我！ | I tidied up the desk! Praise me! |
| T.idle.1.6 | 你想到要做什么了吗？我准备好啦。 | Have you decided what to do? I'm ready. |
| T.idle.1.7 | 不急不急，想好了再说～ | No rush, no rush. Tell me when you've figured it out~ |
| T.idle.1.8 | 今天要一起干点什么大事呢？ | What big thing are we doing together today? |
| T.idle.2.1 | 你在的话，我就很安心。 | When you're here, I feel at ease. |
| T.idle.2.2 | 想和你一起把今天做完呢。 | I'd like to get through today together with you. |
| T.idle.2.3 | 不急，我一直都在哦。 | No hurry. I'm always right here. |
| T.idle.2.4 | 你安静想事情的样子，我也喜欢看。 | I like watching you think quietly, too. |
| T.idle.2.5 | 累了就跟我说，我陪你歇会儿。 | Tell me if you get tired. I'll rest with you for a while. |
| T.idle.2.6 | 有你在身边，连等待都不无聊。 | With you beside me, even waiting isn't boring. |
| T.idle.2.7 | 我在这儿呢，慢慢来。 | I'm right here. Take your time. |
| T.idle.2.8 | 今天也想多陪你一会儿。 | I want to stay with you a little longer today, too. |

### `work`

| 编号 | 中文 | English |
|---|---|---|
| T.work.0.1 | 正在处理，请稍候。 | Working on it. One moment, please. |
| T.work.0.2 | 努力工作中…… | Working hard… |
| T.work.0.3 | 马上就好，主人。 | Almost done, Master. |
| T.work.0.4 | 正在逐项办理，请稍等。 | Handling the items one by one. Please wait a moment. |
| T.work.0.5 | 请放心，我会仔细完成的。 | Please rest assured; I will see it through carefully. |
| T.work.0.6 | 正在执行，请勿担心。 | Carrying it out now. Please don't worry. |
| T.work.0.7 | 手头的工作正在推进。 | The work at hand is progressing. |
| T.work.0.8 | 请再给我一点时间，主人。 | Please give me a little more time, Master. |
| T.work.1.1 | 敲键盘敲得手指都热啦～ | My fingers are hot from all this typing~ |
| T.work.1.2 | 快好了快好了！ | Almost there, almost there! |
| T.work.1.3 | 别催嘛，我在认真做！ | Don't rush me, I'm working seriously! |
| T.work.1.4 | 哼哧哼哧，干活中～ | Huff, puff… hard at work~ |
| T.work.1.5 | 这点小事难不倒我！ | A little thing like this won't stop me! |
| T.work.1.6 | 加油加油，再坚持一下下！ | Go, go! Just a little longer! |
| T.work.1.7 | 忙起来的时候别打扰我哦～ | Don't bother me when I'm busy~ |
| T.work.1.8 | 我可是很能干的！ | I'm really quite capable, you know! |
| T.work.2.1 | 交给我吧，你放心。 | Leave it to me. Don't worry. |
| T.work.2.2 | 我会把它做好的。 | I'll make sure it turns out well. |
| T.work.2.3 | 再等我一下下～ | Just wait a tiny bit more for me~ |
| T.work.2.4 | 我在认真做，你喝口水等等我。 | I'm working carefully. Have some water while you wait for me. |
| T.work.2.5 | 别担心，我在呢。 | Don't worry, I'm here. |
| T.work.2.6 | 每一步我都会好好做的。 | I'll do every step properly. |
| T.work.2.7 | 为了你，我会很用心的。 | I'll put my whole heart into it for you. |
| T.work.2.8 | 马上就能给你好消息了。 | I'll have good news for you soon. |

### `think`

| 编号 | 中文 | English |
|---|---|---|
| T.think.0.1 | 正在思考，请稍等。 | Thinking. Please wait a moment. |
| T.think.0.2 | 让我想一想…… | Let me think… |
| T.think.0.3 | 嗯…… | Hmm… |
| T.think.0.4 | 容我斟酌片刻，主人。 | Allow me a moment to consider, Master. |
| T.think.0.5 | 请稍候，我在整理思路。 | One moment, please. I'm gathering my thoughts. |
| T.think.0.6 | 这个问题需要仔细考虑。 | This matter requires careful thought. |
| T.think.0.7 | 正在权衡，请稍等。 | Weighing the options. Please wait. |
| T.think.0.8 | 请允许我想一想。 | Please allow me to think it over. |
| T.think.1.1 | 唔……这个有点意思。 | Hmm… this is kind of interesting. |
| T.think.1.2 | 等等，让我捋捋思路～ | Wait, let me sort out my thoughts~ |
| T.think.1.3 | 我在想，别吵我哦。 | I'm thinking, so don't bug me. |
| T.think.1.4 | 嗯嗯嗯……脑袋转起来啦！ | Mm-hm-hm… my brain's spinning up! |
| T.think.1.5 | 让我挠挠头，马上有主意～ | Let me scratch my head, an idea's coming~ |
| T.think.1.6 | 哇，这题有点难，不过我喜欢！ | Whoa, this one's tough, but I like it! |
| T.think.1.7 | 别急别急，灵感快来了。 | Easy, easy, inspiration is on its way. |
| T.think.1.8 | 唔……有头绪了又好像没有…… | Hmm… I think I've got it, or maybe not… |
| T.think.2.1 | 嗯……让我好好想想。 | Mm… let me think this through properly. |
| T.think.2.2 | 我在想怎样才能最帮到你。 | I'm thinking about how I can help you the most. |
| T.think.2.3 | 别担心，我在想办法。 | Don't worry, I'm figuring something out. |
| T.think.2.4 | 给我一点安静的时间，好吗？ | Could you give me a little quiet time? |
| T.think.2.5 | 我想想……怎样对你最好。 | Let me think… what would be best for you. |
| T.think.2.6 | 你在旁边，我想得更起劲了。 | With you beside me, I think even harder. |
| T.think.2.7 | 让我想个周全的办法。 | Let me come up with a thorough plan. |
| T.think.2.8 | 再等我一下，我快想到了。 | Wait a little longer; I'm almost there. |

### `wait`

| 编号 | 中文 | English |
|---|---|---|
| T.wait.0.1 | 主人，需要您确认。 | Master, your confirmation is needed. |
| T.wait.0.2 | 请您过目，主人。 | Please take a look, Master. |
| T.wait.0.3 | 等候您的指示。 | Awaiting your instructions. |
| T.wait.1.1 | 主人～该你拿主意啦！ | Master~ it's time for you to decide! |
| T.wait.1.2 | 喂，这里要你点头才行哦。 | Hey, I need your nod here. |
| T.wait.1.3 | 我可不敢擅自做主～ | I wouldn't dare decide on my own~ |
| T.wait.2.1 | 这个要你来决定哦。 | This one is up to you. |
| T.wait.2.2 | 我等你，不着急。 | I'll wait for you. No hurry. |
| T.wait.2.3 | 看一眼就好，好吗？ | Just take a quick look, okay? |

### `done`

| 编号 | 中文 | English |
|---|---|---|
| T.done.0.1 | 已完成，请主人过目。 | Done. Please have a look, Master. |
| T.done.0.2 | 任务完成了，主人。 | The task is complete, Master. |
| T.done.0.3 | 做好了，请检查。 | It's finished. Please check it. |
| T.done.0.4 | 辛苦了，主人。 | Thank you for your hard work, Master. |
| T.done.0.5 | 事务已办妥，请查收。 | The matter is settled. Please review. |
| T.done.0.6 | 一切就绪，请您确认。 | Everything is ready. Please confirm. |
| T.done.0.7 | 承蒙等候，已经完成。 | Thank you for waiting. It is done. |
| T.done.0.8 | 请主人验收。 | Master, please inspect the result. |
| T.done.1.1 | 搞定啦！快夸夸我～ | All done! Quick, praise me~ |
| T.done.1.2 | 完成！是不是很快？ | Finished! Pretty fast, right? |
| T.done.1.3 | 好啦好啦，做完了！ | Okay, okay, it's done! |
| T.done.1.4 | 要不要奖励我一下？ | Shall I get a reward? |
| T.done.1.5 | 漂亮！我自己都想鼓掌～ | Beautiful! Even I want to applaud~ |
| T.done.1.6 | 怎么样怎么样，没让你失望吧！ | Well? Well? I didn't let you down, did I! |
| T.done.1.7 | 收工收工！ | Wrapping up, wrapping up! |
| T.done.1.8 | 今天的我，也很可靠吧？ | I'm reliable again today, aren't I? |
| T.done.2.1 | 做完啦，你看看满不满意？ | It's done. Let me know if you're happy with it? |
| T.done.2.2 | 辛苦啦，我们一起完成的呢。 | Good work. We got it done together. |
| T.done.2.3 | 能帮到你，我真的很开心。 | I'm really happy I could help you. |
| T.done.2.4 | 今天也一起做到了呢。 | We managed it together again today. |
| T.done.2.5 | 每次做完，都觉得和你更近了一点。 | Every time we finish something, I feel a little closer to you. |
| T.done.2.6 | 好啦，来摸摸头吧？ | There, how about a head pat? |
| T.done.2.7 | 你满意的话，我就特别满足。 | If you're satisfied, I'm completely content. |
| T.done.2.8 | 做完了，歇一歇吧，我陪你。 | It's done. Take a break; I'll keep you company. |

### `sleep`

| 编号 | 中文 | English |
|---|---|---|
| T.sleep.0.1 | ……（轻轻打盹） | …(dozing lightly) |
| T.sleep.0.2 | 主人不在的时候，稍微休息一下…… | While Master is away, I'll rest just a little… |
| T.sleep.0.3 | Zzz…… | Zzz… |
| T.sleep.1.1 | Zzz……再眯一会儿…… | Zzz… just a little more nap… |
| T.sleep.1.2 | （打哈欠）你怎么还不来呀…… | (yawns) Why aren't you here yet… |
| T.sleep.1.3 | 睡着前最后一句：别熬夜哦。 | Last words before I fall asleep: don't stay up late. |
| T.sleep.2.1 | Zzz……梦里也在等你…… | Zzz… I'm waiting for you in my dreams, too… |
| T.sleep.2.2 | 你回来了就叫我，我马上醒。 | Wake me when you're back; I'll be up right away. |
| T.sleep.2.3 | （靠着桌子睡着了） | (fell asleep leaning on the desk) |

### `worry`

| 编号 | 中文 | English |
|---|---|---|
| T.worry.0.1 | 出现问题了，对不起，主人。 | A problem has occurred. I apologize, Master. |
| T.worry.0.2 | 似乎出错了，请稍后再试。 | It seems something went wrong. Please try again later. |
| T.worry.1.1 | 呜，出错啦……不是我的错哦！ | Waah, an error… it's not my fault, okay! |
| T.worry.1.2 | 糟糕，出问题了，一起看看？ | Uh-oh, something broke. Shall we look together? |
| T.worry.2.1 | 出错了……别急，我们一起想办法。 | An error… don't panic, we'll work it out together. |
| T.worry.2.2 | 对不起，这次没做好。我会再试的。 | I'm sorry, I didn't get it right this time. I'll try again. |

### `pat`

| 编号 | 中文 | English |
|---|---|---|
| T.pat.0.1 | 这、这样不太合规矩吧，主人…… | Th-this isn't quite proper, is it, Master… |
| T.pat.0.2 | 谢、谢谢主人…… | Th-thank you, Master… |
| T.pat.0.3 | （脸红）请不要这样，主人。 | (blushes) Please don't, Master. |
| T.pat.0.4 | 主人的手好温暖…… | Master's hand is so warm… |
| T.pat.1.1 | 嘿嘿，再摸一下嘛～ | Hehe, pat me one more time~ |
| T.pat.1.2 | 好舒服～继续继续！ | That feels nice~ Keep going, keep going! |
| T.pat.1.3 | 你今天心情不错嘛～ | You're in a good mood today~ |
| T.pat.1.4 | 别以为摸头就能糊弄我哦！ | Don't think a head pat will get you out of everything! |
| T.pat.2.1 | 你摸我的头，我就觉得很安心。 | When you pat my head, I feel so safe. |
| T.pat.2.2 | 我最喜欢你摸头的时候了。 | I love it most when you pat my head. |
| T.pat.2.3 | 靠近一点点也没关系哦。 | It's fine to come a little closer. |
| T.pat.2.4 | 有你在真好。 | I'm so glad you're here. |

### `poke`

| 编号 | 中文 | English |
|---|---|---|
| T.poke.0.1 | 呀！主人有何吩咐？ | Eek! What are your orders, Master? |
| T.poke.0.2 | 诶？请问有什么事吗？ | Huh? May I ask what it is? |
| T.poke.0.3 | 主、主人，请不要吓我。 | M-Master, please don't startle me. |
| T.poke.0.4 | （探头） | (peeks out) |
| T.poke.1.1 | 哇！突然戳我干嘛～ | Whoa! Why poke me out of nowhere~ |
| T.poke.1.2 | 别戳啦，痒～ | Stop poking, it tickles~ |
| T.poke.1.3 | 再戳我就要生气啦！（才不会） | Poke me again and I'll get mad! (No I won't.) |
| T.poke.1.4 | 你是不是想我了？ | Did you miss me? |
| T.poke.2.1 | 嗯？想我了吗？ | Hm? Did you miss me? |
| T.poke.2.2 | 别闹啦……不过你戳我我也不讨厌。 | Stop teasing… though I don't mind when you poke me. |
| T.poke.2.3 | 我在哦，一直都在。 | I'm here. I've always been here. |
| T.poke.2.4 | 又找我玩吗？好呀。 | Want to play with me again? Sure. |

### `longDone`

| 编号 | 中文 | English |
|---|---|---|
| T.longDone.0.1 | 任务已完成，用时 {m} 分钟，请主人过目。 | The task is complete after {m} min. Please have a look, Master. |
| T.longDone.0.2 | 辛苦了，{m} 分钟的任务已经完成。 | Thank you for your effort. The {m}-minute task is complete. |
| T.longDone.1.1 | {m} 分钟的大活儿搞定啦，快来看看！ | The big {m}-minute job is done, come take a look! |
| T.longDone.1.2 | 久等啦～花了 {m} 分钟，不过值得！ | Thanks for waiting~ It took {m} min, but it was worth it! |
| T.longDone.2.1 | 让你等了 {m} 分钟，抱歉。做好了，来看看吧。 | Sorry to keep you waiting {m} min. It's done, come see. |
| T.longDone.2.2 | {m} 分钟的任务完成啦，辛苦你陪我等。 | The {m}-minute task is done. Thank you for waiting with me. |

### `rest`

| 编号 | 中文 | English |
|---|---|---|
| T.rest.0.1 | 主人，您已经连续工作一小时了，请适当休息。 | Master, you have been working for an hour straight. Please take a suitable rest. |
| T.rest.0.2 | 主人，休息一下对身体好，请起来活动活动吧。 | Master, a break is good for your health. Please get up and move around. |
| T.rest.0.3 | 已工作一小时，请主人注意身体。 | One hour of work done. Please look after your health, Master. |
| T.rest.1.1 | 喂喂，你已经连续工作一小时啦，起来动一动！ | Hey hey, you've been working for a full hour — get up and move! |
| T.rest.1.2 | 一小时了哦，眼睛都要冒烟了吧？休息一下～ | It's been an hour! Your eyes must be smoking. Take a break~ |
| T.rest.1.3 | 不许再硬撑啦，先去喝杯水！ | No more pushing through it — go get a glass of water first! |
| T.rest.2.1 | 你已经工作一个小时了，我有点心疼，歇一会儿好吗？ | You've been working for an hour. It worries me a little — could you rest for a while? |
| T.rest.2.2 | 别太累了，休息一下，我在这里等你。 | Don't wear yourself out. Take a break; I'll wait here for you. |
| T.rest.2.3 | 一小时啦，陪我伸个懒腰好不好？ | It's been an hour. Stretch with me, okay? |

### `restOk`

| 编号 | 中文 | English |
|---|---|---|
| T.restOk.0.1 | 好的，我一小时后再提醒您。 | Understood. I will remind you again in an hour. |
| T.restOk.0.2 | 遵命，主人。 | As you wish, Master. |
| T.restOk.1.1 | 好吧好吧，一小时后我再来唠叨你～ | Alright, alright, I'll nag you again in an hour~ |
| T.restOk.1.2 | 知道就好～我会盯着的！ | Good that you know~ I'll be watching! |
| T.restOk.2.1 | 嗯，那一小时后我再提醒你。 | Mm, then I'll remind you again in an hour. |
| T.restOk.2.2 | 答应我，别太勉强自己。 | Promise me you won't push yourself too hard. |

### `focusStart`

| 编号 | 中文 | English |
|---|---|---|
| T.focusStart.0.1 | 专注时间开始，我会安静陪着您。 | Focus time begins. I will quietly stay by your side. |
| T.focusStart.0.2 | 开始计时二十五分钟，请专心。 | The 25-minute timer has started. Please concentrate. |
| T.focusStart.1.1 | 开始专注啦！我会乖乖不吵你～ | Focus time! I'll be good and won't bother you~ |
| T.focusStart.1.2 | 二十五分钟，我陪你一起冲！ | Twenty-five minutes — let's dash through them together! |
| T.focusStart.2.1 | 开始吧，我就在你旁边。 | Let's begin. I'm right beside you. |
| T.focusStart.2.2 | 二十五分钟，我们一起加油。 | Twenty-five minutes. We'll do our best together. |

### `focusLine`

| 编号 | 中文 | English |
|---|---|---|
| T.focusLine.0.1 | 专注中，请勿打扰…… | Focusing. Please do not disturb… |
| T.focusLine.0.2 | 正在陪伴主人专注。 | Keeping Master company during focus time. |
| T.focusLine.1.1 | 嘘——专注中～ | Shh— focusing~ |
| T.focusLine.1.2 | 我也在认真陪着哦。 | I'm seriously keeping you company, too. |
| T.focusLine.2.1 | 我陪着你，慢慢来。 | I'm with you. Take your time. |
| T.focusLine.2.2 | 专心做吧，我在呢。 | Concentrate. I'm here. |

### `focusDone`

| 编号 | 中文 | English |
|---|---|---|
| T.focusDone.0.1 | 专注时间结束，请主人休息五分钟。 | Focus time is over. Please rest for five minutes, Master. |
| T.focusDone.0.2 | 二十五分钟到了，辛苦了，主人。 | Twenty-five minutes are up. Well done, Master. |
| T.focusDone.1.1 | 时间到！你超棒的～休息五分钟吧！ | Time's up! You're amazing~ Take a five-minute break! |
| T.focusDone.1.2 | 二十五分钟完成！奖励自己一下吧！ | Twenty-five minutes done! Treat yourself! |
| T.focusDone.2.1 | 时间到啦，你很棒哦。休息一下，我给你捶捶肩。 | Time's up — you did great. Take a break; I'll rub your shoulders. |
| T.focusDone.2.2 | 做完这一段，我真为你骄傲。 | Finishing this stretch makes me really proud of you. |

### `breakLine`

| 编号 | 中文 | English |
|---|---|---|
| T.breakLine.0.1 | 休息时间，请放松一下。 | Break time. Please relax for a moment. |
| T.breakLine.0.2 | 请稍作休息，主人。 | Please rest a little, Master. |
| T.breakLine.1.1 | 休息中休息中～放松放松！ | Resting, resting~ relax, relax! |
| T.breakLine.1.2 | 五分钟，什么都不用想～ | Five minutes with nothing to think about~ |
| T.breakLine.2.1 | 好好歇一会儿，我陪着你。 | Rest well for a while. I'm with you. |
| T.breakLine.2.2 | 来，喝口水，靠一靠。 | Here, have some water and lean back. |

### `breakDone`

| 编号 | 中文 | English |
|---|---|---|
| T.breakDone.0.1 | 休息结束，请主人继续。 | Break over. Please continue, Master. |
| T.breakDone.0.2 | 五分钟到了，精神恢复了吗？ | Five minutes are up. Are you refreshed? |
| T.breakDone.1.1 | 休息完毕！满血复活了吗～ | Break finished! Fully recharged~? |
| T.breakDone.1.2 | 时间到啦，继续加油！ | Time's up, keep it up! |
| T.breakDone.2.1 | 歇够了吗？那我们继续吧。 | Rested enough? Then let's continue. |
| T.breakDone.2.2 | 充好电了的话，我们再来一轮？ | If you're recharged, shall we go another round? |

### `summary`

| 编号 | 中文 | English |
|---|---|---|
| T.summary.0.1 | 以上是今日的工作报告，辛苦了。 | That concludes today's work report. Thank you for your hard work. |
| T.summary.0.2 | 今天也请好好休息，主人。 | Please rest well today as well, Master. |
| T.summary.1.1 | 今天的成绩单～你很棒哦！ | Today's report card~ you did great! |
| T.summary.1.2 | 今天也完成了好多呢！ | We got so much done today again! |
| T.summary.2.1 | 今天辛苦啦，我都看在眼里。 | Good work today. I saw all of it. |
| T.summary.2.2 | 不管多少，我都为你骄傲。 | No matter how much it is, I'm proud of you. |

### `compact`

| 编号 | 中文 | English |
|---|---|---|
| T.compact.0.1 | 正在整理对话记录，请稍候。 | Organizing the conversation record. Please wait. |
| T.compact.0.2 | 压缩中，请勿打扰…… | Compacting. Please do not disturb… |
| T.compact.1.1 | 整理中整理中～马上就好！ | Tidying, tidying~ done in a moment! |
| T.compact.1.2 | 把记忆压一压，轻装上阵～ | Squishing the memories down, traveling light~ |
| T.compact.2.1 | 在帮你整理记忆，等我一下下。 | I'm organizing your memories. Wait for me a tiny bit. |
| T.compact.2.2 | 别担心，重要的我都会留着。 | Don't worry, I'll keep everything important. |

### `compactDone`

| 编号 | 中文 | English |
|---|---|---|
| T.compactDone.0.1 | 整理完毕，已腾出空间。 | Organizing complete. Space has been freed. |
| T.compactDone.0.2 | 压缩完成，可以继续了。 | Compaction complete. You may continue. |
| T.compactDone.1.1 | 整理好啦！清爽多了～ | All tidied! Much fresher~ |
| T.compactDone.1.2 | 腾出好多空间，继续吧！ | Loads of space freed up, let's keep going! |
| T.compactDone.2.1 | 整理好了，重要的我都好好收着。 | All organized. I've kept everything important safe. |
| T.compactDone.2.2 | 轻松多啦，我们接着来。 | Feels so much lighter. Let's carry on. |

### `focusCancel`

| 编号 | 中文 | English |
|---|---|---|
| T.focusCancel.0.1 | 已取消专注计时。 | The focus timer has been cancelled. |
| T.focusCancel.0.2 | 好的，已取消。 | Understood, cancelled. |
| T.focusCancel.1.1 | 取消啦？没关系，下次再来～ | Cancelled? No problem, next time~ |
| T.focusCancel.1.2 | 中途休息也可以哦。 | It's fine to stop halfway, too. |
| T.focusCancel.2.1 | 没关系，累了就不要勉强。 | It's okay. If you're tired, don't force yourself. |
| T.focusCancel.2.2 | 休息够了我们再开始。 | We'll start again when you've rested enough. |

### `warn5h`

| 编号 | 中文 | English |
|---|---|---|
| T.warn5h.0.1 | 主人，五小时额度即将用完。 | Master, the five-hour quota is almost used up. |
| T.warn5h.0.2 | 提醒：五小时额度所剩不多。 | Reminder: little of the five-hour quota remains. |
| T.warn5h.1.1 | 五小时额度快见底啦，省着点用～ | The five-hour quota is nearly empty — use it sparingly~ |
| T.warn5h.1.2 | 额度吃紧了哦，主人！ | The quota is running tight, Master! |
| T.warn5h.2.1 | 额度快用完了，我们慢一点也没关系。 | The quota is almost gone. It's fine if we slow down a bit. |
| T.warn5h.2.2 | 别担心，剩下的我们精打细算用。 | Don't worry, we'll budget what's left carefully. |

### `warnCtx`

| 编号 | 中文 | English |
|---|---|---|
| T.warnCtx.0.1 | 上下文已接近上限，建议整理。 | The context is nearing its limit. I recommend compacting. |
| T.warnCtx.0.2 | 主人，上下文快满了。 | Master, the context is almost full. |
| T.warnCtx.1.1 | 上下文快满啦，该整理一下了～ | The context is almost full — time to tidy up~ |
| T.warnCtx.1.2 | 脑袋快塞不下了，帮我清一清？ | My head is about to overflow. Help me clear it out? |
| T.warnCtx.2.1 | 我的记忆快满了，要不要整理一下？ | My memory is almost full. Shall we tidy it up? |
| T.warnCtx.2.2 | 再多我可能会忘事，帮我整理一下吧。 | Any more and I might forget things. Please help me organize it. |

### `levelUp`

| 编号 | 中文 | English |
|---|---|---|
| T.levelUp.0.1 | 好感度提升到 Lv.{l}，谢谢主人的照顾。 | Affection has risen to Lv.{l}. Thank you for your kindness, Master. |
| T.levelUp.1.1 | 好感度 Lv.{l}！我们越来越熟啦～ | Affection Lv.{l}! We're getting closer~ |
| T.levelUp.2.1 | Lv.{l} 了呢……谢谢你一直陪着我。 | Lv.{l} now… thank you for always staying with me. |

### `ach`

| 编号 | 中文 | English |
|---|---|---|
| T.ach.0.1 | 达成成就：{a} | Achievement unlocked: {a} |
| T.ach.1.1 | 成就解锁：{a}，厉害！ | Achievement unlocked: {a}. Impressive! |
| T.ach.2.1 | 新成就：{a}，我为你高兴。 | New achievement: {a}. I'm happy for you. |

### `greetBack`

| 编号 | 中文 | English |
|---|---|---|
| T.greetBack.0.1 | 欢迎回来，主人。 | Welcome back, Master. |
| T.greetBack.0.2 | 主人，您来了。 | Master, you've arrived. |
| T.greetBack.1.1 | 你回来啦～ | You're back~ |
| T.greetBack.1.2 | 哟，主人，又见面啦！ | Yo, Master, we meet again! |
| T.greetBack.2.1 | 欢迎回来，我等你好久了。 | Welcome back. I've been waiting for you for ages. |
| T.greetBack.2.2 | 回来了就好。 | I'm just glad you're back. |

### `streakLine`

| 编号 | 中文 | English |
|---|---|---|
| T.streakLine.0.1 | 已连续第 {n} 天为您服务。 | Day {n} of serving you in a row. |
| T.streakLine.1.1 | 连续第 {n} 天啦，不错嘛～ | Day {n} in a row — not bad~ |
| T.streakLine.2.1 | 我们已经连续 {n} 天见面了呢。 | We've met {n} days in a row now. |

### `hello0`

| 编号 | 时段 | 中文 | English |
|---|---|---|---|
| T.hello0.1 | 早上 | 早上好，主人。今天也请多关照。 | Good morning, Master. I look forward to your guidance again today. |
| T.hello0.2 | 中午 | 主人，中午好，记得吃饭。 | It's noon, Master. Please remember to have lunch. |
| T.hello0.3 | 下午 | 下午好，主人。 | Good afternoon, Master. |
| T.hello0.4 | 晚上 | 晚上好，主人，今天辛苦了。 | Good evening, Master. Thank you for your hard work today. |
| T.hello0.5 | 深夜 | 主人，夜深了，请注意休息。 | Master, it is late at night. Please take care to rest. |

### `hello1`

| 编号 | 时段 | 中文 | English |
|---|---|---|---|
| T.hello1.1 | 早上 | 早啊主人～今天也要加油哦！ | Morning, Master~ Let's do our best today, too! |
| T.hello1.2 | 中午 | 中午啦，别光顾着干活，先吃饭！ | It's noon! Don't just keep working — eat first! |
| T.hello1.3 | 下午 | 下午好～来杯茶提提神？ | Good afternoon~ How about a cup of tea to perk up? |
| T.hello1.4 | 晚上 | 晚上好～今天过得怎么样？ | Good evening~ How was your day? |
| T.hello1.5 | 深夜 | 这么晚还不睡？不许熬夜哦！ | Still up this late? No staying up all night! |

### `hello2`

| 编号 | 时段 | 中文 | English |
|---|---|---|---|
| T.hello2.1 | 早上 | 早上好呀，今天也想和你一起度过。 | Good morning. I want to spend today with you, too. |
| T.hello2.2 | 中午 | 中午好，吃过饭了吗？我有点惦记你。 | Good afternoon. Have you eaten? I've been a little worried about you. |
| T.hello2.3 | 下午 | 下午好，看到你就安心了。 | Good afternoon. Seeing you puts my mind at ease. |
| T.hello2.4 | 晚上 | 你回来啦，今天辛苦了。 | You're back. You worked hard today. |
| T.hello2.5 | 深夜 | 这么晚了，早点睡吧，我陪你到最后一刻。 | It's so late. Go to bed early; I'll stay with you until the very last moment. |

## 2. 成就

分组名：

| 编号 | 中文 | English |
|---|---|---|
| G.chat | 对话与工具 | Chat & Tools |
| G.bond | 陪伴 | Companionship |
| G.love | 好感度 | Affection |
| G.play | 互动 | Interaction |
| G.focus | 专注与休息 | Focus & Rest |
| G.misc | 其他 | Misc |
| G.secret | 隐藏 | Hidden |

成就（"她" = 桌宠）：

| 编号 | 中文名称 | English name | 中文描述 | English description |
|---|---|---|---|---|
| A.first | 初次见面 | First Meeting | 完成第一轮对话 | Complete your first turn |
| A.t100 | 小有成就 | Getting Somewhere | 累计完成 100 轮 | Complete 100 turns in total |
| A.t500 | 得力助手 | Reliable Helper | 累计完成 500 轮 | Complete 500 turns in total |
| A.t1000 | 千锤百炼 | Well Tempered | 累计完成 1000 轮 | Complete 1,000 turns in total |
| A.t3000 | 身经百战 | Battle-Hardened | 累计完成 3000 轮 | Complete 3,000 turns in total |
| A.day50 | 忙碌的一天 | Busy Day | 一天内完成 50 轮 | Complete 50 turns in one day |
| A.tool1k | 工具达人 | Tool Enthusiast | 累计 1000 次工具调用 | 1,000 tool calls in total |
| A.tool5k | 工具大师 | Tool Master | 累计 5000 次工具调用 | 5,000 tool calls in total |
| A.str3 | 三天之约 | Three-Day Promise | 连续 3 天打开 | Open it 3 days in a row |
| A.str7 | 一周陪伴 | A Week Together | 连续 7 天打开 | Open it 7 days in a row |
| A.str14 | 两周相伴 | Two Weeks Side by Side | 连续 14 天打开 | Open it 14 days in a row |
| A.str30 | 满月之约 | Full-Moon Promise | 连续 30 天打开 | Open it 30 days in a row |
| A.str100 | 百日相伴 | A Hundred Days Together | 连续 100 天打开 | Open it 100 days in a row |
| A.lv5 | 渐入佳境 | Warming Up | 好感度达到 Lv.5 | Reach affection Lv.5 |
| A.lv7 | 不再生分 | No Longer Strangers | 好感度达到 Lv.7（成为朋友） | Reach affection Lv.7 (become friends) |
| A.lv10 | 亲密无间 | Inseparable | 好感度达到 Lv.10 | Reach affection Lv.10 |
| A.lv14 | 成为家人 | Like Family | 好感度达到 Lv.14（成为家人） | Reach affection Lv.14 (become family) |
| A.lv20 | 心意相通 | Hearts Connected | 好感度达到 Lv.20（满级） | Reach affection Lv.20 (max level) |
| A.pat50 | 摸头爱好者 | Head-Pat Fan | 摸头 50 次 | Pat her head 50 times |
| A.pat200 | 摸头大师 | Head-Pat Master | 摸头 200 次 | Pat her head 200 times |
| A.pat500 | 摸头宗师 | Head-Pat Grandmaster | 摸头 500 次 | Pat her head 500 times |
| A.poke50 | 戳戳乐 | Poke Party | 戳一下 50 次 | Poke her 50 times |
| A.foc1 | 初次专注 | First Focus | 完成 1 个番茄钟 | Complete 1 pomodoro (focus timer) |
| A.foc10 | 专注达人 | Focus Expert | 完成 10 个番茄钟 | Complete 10 pomodoros |
| A.foc50 | 番茄大师 | Tomato Master | 完成 50 个番茄钟 | Complete 50 pomodoros |
| A.brk1 | 好好休息 | Proper Rest | 完整休息满 5 分钟 | Rest a full 5 minutes |
| A.brk10 | 懂得休息 | Knows How to Rest | 完整休息 10 次 | Take 10 full breaks |
| A.owl | 夜猫子 | Night Owl | 在凌晨 0 到 5 点完成一轮 | Finish a turn between midnight and 5 a.m. |
| A.long | 持久战 | Long Haul | 一轮任务超过 10 分钟 | A single turn lasts over 10 minutes |
| A.long30 | 马拉松 | Marathon | 一轮任务超过 30 分钟 | A single turn lasts over 30 minutes |
| A.cmp1 | 轻装上阵 | Traveling Light | 压缩一次上下文 | Compact the context once |
| A.cmp10 | 整理大师 | Tidying Master | 压缩 10 次上下文 | Compact the context 10 times |
| A.peak | 极限操作 | Pushing the Limit | 5 小时额度用到 95% 以上 | Use over 95% of the 5-hour quota |
| A.err10 | 屡败屡战 | Down but Not Out | 经历 10 次出错 | Run into 10 errors |
| A.wake | 别吵醒我 | Don't Wake Me | 把睡着的她戳醒 10 次 | Poke her awake 10 times while she is asleep |
| A.burst | 戳戳戳 | Poke Poke Poke | 10 秒内连续戳她 5 次 | Poke her 5 times within 10 seconds |
| A.ignore | 不听劝 | Won't Listen | 休息提醒出现后没点“知道啦”，又发了 5 条消息 | Send 5 more messages after the rest reminder appears, without clicking “Got it” |
| A.all | 全部收集 | Collect Them All | 解锁所有普通成就 | Unlock every regular achievement |

## 3. 按钮、面板、右栏、提示、命令

| 编号 | 中文 | English |
|---|---|---|
| btn.show | 显示桌宠 | Show pet |
| btn.pat | 摸摸头 | Pat head |
| btn.poke | 戳一下 | Poke |
| btn.focus | 专注 25 分钟 | Focus 25 min |
| btn.focusCancel | 放弃专注 · 剩 {n} 分 | Give up focus · {n} min left |
| btn.compact | 压缩上下文 | Compact context |
| btn.breakEnd | 结束休息 · 剩 {n} 分 | End break · {n} min left |
| btn.ok | 知道啦 | Got it |
| btn.okWarn | 知道啦 | Got it |
| btn.hide | 隐藏 | Hide |
| btn.sum | 今日 {t} 轮 · {x} 工具 · {f} 番茄 {▾/▸} | Today {t} turns · {x} tools · {f} pomo {▾/▸} |
| btn.ach | 成就 {a}/{b} {▾/▸} | Achievements {a}/{b} {▾/▸} |
| btn.group | {▾/▸} {分组名} {已解锁}/{总数} | {▾/▸} {group} {got}/{total} |
| panel.sumTitle | 今日小结　{一句台词} | Today's summary　{line} |
| panel.sum1 | · 对话 {t} 轮，调用工具 {x} 次 | · {t} turns, {x} tool calls |
| panel.sum2 | · 番茄钟 {f} 个（专注 {m} 分钟）　摸摸头 {p} 次 | · {f} pomodoros ({m} min focused)　head pats: {p} |
| panel.sum3 | · 连续使用 {n} 天（最长 {max} 天）　好感度 Lv.{l} | · Streak: {n} days (longest {max})　Affection Lv.{l} |
| panel.sum4 | · 累计 {t} 轮 · {x} 工具 · {f} 番茄 · 最长一次任务 {m} 分钟 | · Total: {t} turns · {x} tools · {f} pomodoros · longest task {m} min |
| panel.achHint | 点上面的分类，看已解锁和未解锁的成就。 | Click a category above to see unlocked and locked achievements. |
| panel.achRow | ✓ {名称}　{描述}　+{奖励}♥ | ✓ {name}　{desc}　+{rw}♥ |
| panel.achRowLocked | · {名称}　{描述}　{当前}/{目标}　+{奖励}♥ | · {name}　{desc}　{cur}/{goal}　+{rw}♥ |
| panel.hidden | ？ 还有 {n} 个隐藏成就等你发现 | ? {n} more hidden achievements to discover |
| col.5h | 5H 重置 {时间} | 5H resets in {time} |
| col.7d | 7D 重置 {时间} | 7D resets in {time} |
| col.cache | 缓存 {n}% | Cache {n}% |
| col.cost | 本会话 ${n} | Session ${n} |
| toast.manyAch | 一口气解锁了 {n} 个成就：{a}、{b}、{c}等 | Unlocked {n} achievements at once: {a}, {b}, {c} and more |
| toast.draftNotEmpty | 输入框里已经有内容了，先发送或清空，再点“压缩上下文”。 | The prompt box already has text. Send or clear it first, then click “Compact context”. |
| toast.compactFilled | 已填好 /compact，按回车开始压缩（也可以在后面写要保留什么）。 | /compact is filled in. Press Enter to start compacting (you can also add what to keep after it). |
| toast.compactFail | 现在填不进输入框，请直接输入 /compact。 | Can't fill the prompt box right now. Please type /compact yourself. |
| toast.compactFail2 | 现在填不进输入框，请直接输入 /compact。 | Can't fill the prompt box right now. Please type /compact yourself. |
| toast.demo | 这就是弹出提示的样子，会停留 10 秒。 | This is what a pop-up notice looks like. It stays for 10 seconds. |
| cmd.description | 演示桌宠的提醒和姿势 | Preview the pet's reminders and poses |
| cmd.long | 演示：长任务完成（姿势保持 1 分钟，或到下一次发消息） | Demo: long task finished (the pose stays for 1 minute, or until your next message) |
| cmd.rest | 演示：连续工作提醒（出现“知道啦”按钮，点它就消失） | Demo: continuous-work reminder (a “Got it” button appears; click it to dismiss) |
| cmd.achSample | 示例成就 | Sample achievement |
| cmd.ach | 演示：成就 | Demo: achievement |
| cmd.hello | 演示：每日问候 | Demo: daily greeting |
| cmd.warn | 演示：额度提醒（担心姿势带眨眼，点“知道啦”消失，1 分钟后自动恢复） | Demo: quota warning (worried pose with blinking; click “Got it” to dismiss, otherwise it clears itself after 1 minute) |
| cmd.level | 演示：升到 Lv.{n}（用法：/pet level 7 可以看别的等级的姿势） | Demo: level up to Lv.{n} (usage: /pet level 7 shows the poses of other levels) |
| cmd.focus | 演示：番茄钟开始 / 放弃专注 | Demo: pomodoro started / focus given up |
| cmd.compact | 演示：压缩中 15 秒，然后显示整理完毕 | Demo: compacting for 15 seconds, then “done” |
| cmd.version | 桌宠 {BUILD_INFO} | Pet {BUILD_INFO} |
| cmd.break | 演示：休息 1 分钟（发消息、点“结束休息”或开新番茄钟会提前结束，摸头和戳一下不会） | Demo: 1-minute break (sending a message, clicking “End break” or starting a new pomodoro ends it early; patting and poking do not) |
| cmd.focusDone | 演示：番茄钟结束 | Demo: pomodoro finished |
| cmd.usage | 用法：/pet long \| rest \| ach \| hello \| focus \| break \| compact \| warn \| level \| start \| cancel \| version（只是演示，不计入任何统计） | Usage: /pet long \| rest \| ach \| hello \| focus \| break \| compact \| warn \| level \| start \| cancel \| version (demo only; nothing is counted) |

### 翻译时顺带发现的问题（实施时要处理，详见 plan.md）

- **单复数**：`panel.hidden`（"1 more hidden achievements"）和 `panel.sum3`（"1 days"）里的数字可能是 1。中文没有这个问题，英文要么写成 "1 more hidden achievement(s)"，要么在代码里分单复数。
- **分隔符**：`toast.manyAch` 里的 `、` 要换成 `, `，是代码里拼出来的（`:507`），不在文字表里。
- **长度**：英文的按钮和右栏文字比中文宽很多，会影响桌面端按钮行和 90 格的窄屏阈值，已在 plan.md 里量化。
- **引用关系**：`cmd.rest`、`cmd.warn`、`cmd.break`、`toast.draftNotEmpty` 里引用了按钮文字（"Got it"、"End break"、"Compact context"），按钮文字改了这些要同步。
- **测试依赖中文**：`/pet version` 返回 `桌宠 v…`，英文会变成 `Pet v…`，测试里的正则要跟着改。

