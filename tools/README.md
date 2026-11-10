# 构建脚本 / Build scripts

这里是作者用来生成 `hooks/register.tsx` 和 `assets/` 的几个脚本，放出来是为了方便审查：能看到图片是怎么对齐、怎么嵌进代码、闭眼是怎么只改眼睛的。

*The scripts the author uses to produce `hooks/register.tsx` and `assets/`, published so they can be reviewed.*

## 重要：这些脚本不能单独运行

它们需要作者本机的两样东西，没有放进仓库：

- `src/register.template.tsx` 和 `src/index.d.ts`：主逻辑的模板（`hooks/register.tsx` 就是它填好图片之后的样子）和状态类型。
- `source/*.webp`：角色的原图。图片由 AI 工具生成，**不在 MIT 协议的授权范围内**（见仓库根目录 README 的"许可"），所以不在这里。

另外需要 Python 和 Pillow。想用它们，得自己准备同样结构的目录和自己的图片。

## 目录结构（作者本机）

```
<project>/
  build.py            把图片和模板合成 hooks/register.tsx、assets/*.webp、plugin.json
  build/
    prep.py           把 source/ 里的图对齐到同一块画布，写出 build/*_full.png
    transplant.py     只取 GPT 闭眼图里的眼睛，贴到我们自己的睁眼图上
    transplant_watch.py   同上，但只允许两个眼睛区域发生变化（"等助手汇报"那张用）
  src/                模板和状态类型（未公开）
  source/             原图（未公开）
```

## 做什么

1. `build/prep.py`：把每张图裁到同一块画布、脚底对齐，保证换姿势时角色大小不变。
2. `build/transplant.py`、`build/transplant_watch.py`：GPT 画的闭眼图往往整张重画，头发、手会和睁眼图有细微出入。这两个脚本只把眼睛的部分贴回睁眼图，别的地方保持逐像素一致，眨眼时就不会抖。`transplant_watch.py` 多一步：只允许两个眼睛区域变化，因为那张闭眼图的刘海和耳环位置有出入。
3. `build.py <目标插件目录>`：把对齐后的图编码成 WebP 放进 `assets/`，把闭眼和睁眼的差异区域做成小补丁嵌进 `register.tsx`，把小助手那张图按空白切成四张，写出 `plugin.json`、`hooks.json` 和 `types/index.d.ts`。

## 核对过的

作者在把路径改成相对路径之后，重新构建并和已发布的文件比对过：`assets/` 里的 30 张图逐字节相同，`hooks/register.tsx` 除了构建时间一行完全相同，`types/index.d.ts` 相同。
