# 天地劫伤害模拟器 H5

纯静态页面，无前端依赖或构建步骤。原 Excel 保持不变。

## 在线访问

GitHub Pages：https://soarhe.github.io/tdjsimulator/

通过 `.github/workflows/pages.yml` 发布 `h5/dist`。推送 main 分支中的页面改动会自动部署，也可在 Actions 页面手动运行。Excel 和离线 ZIP 不会上传到 Pages 站点。

## 离线分享

执行 `npm run package:offline`（或 `python3 scripts/package_offline.py`），在 `releases/` 生成离线 HTML 和 ZIP。
把 ZIP 发给别人，解压后直接用现代浏览器打开其中的 HTML 即可，不需要本地服务、Excel 或联网。
也可以直接分享单个 HTML。手机文件预览器可能不执行 JavaScript，建议用浏览器打开或在电脑上使用。
离线包由同一套页面和计算引擎生成，内嵌完整运行数据；源文件更新后重新打包即可。

## 本地运行

在此目录执行 `npm start`，打开 http://127.0.0.1:5173 。也可直接执行：

```sh
python3 -m http.server 5173 --bind 127.0.0.1 --directory dist
```

`dist/index.html` 是服务版，不能用 file:// 直接打开；它通过 HTTP 读取 workbook.json。`releases/` 中的离线 HTML 没有此限制。

## 功能

### BP 模拟

访问 `bp/`（本地为 http://127.0.0.1:5173/bp/），或从首页点击“BP 模拟”。同屏双人轮流操作，无后端、无计时、无援战。

- 双方默认使用用户视频开局左侧的 15 人盒子。点击“编辑盒子”以头像选人，支持名称搜索、属相与职业筛选、点击槽位直接替换、移除补选和恢复视频盒子。编辑候选仅包含 Wiki 的绝品与典藏（当前 152 + 7 名），选满 15 名不重复英灵才能保存；取消或 Escape 不保存修改。
- 随机分配先后手，严格按视频的 16 步禁选；每方最终 6 禁、5 选、4 名剩余。
- 支持撤销、重新配置、复制记录和本地进度恢复；存储受限时仍可完成当前对局。
- `dist/bp/rules.mjs` 为独立规则模块，`npm test` 包含双方先手情况下的完整流程校验。
- 此页面随 `h5/dist` 通过原有 GitHub Pages 工作流发布。现有离线伤害演算包不包含 BP 页面。
- 候选卡和上阵栏使用[天地劫 BWIKI 英灵图鉴](https://wiki.biligame.com/tdj/英灵图鉴)的头像，189 张 PNG 保存在 `dist/bp/portraits/`，无需运行时访问外站。`catalog.mjs` 保存 Wiki 品质、属相和职业，头像导入脚本同时更新这些字段。`sources.json` 保留每张图片的原始地址，`portraits.mjs` 按名称匹配；旧名称“赤拔韩无砂”兼容图鉴名称“赤妭韩无砂”。未知名称或加载失败时保留文字占位。
- 更新头像时，先将图鉴 HTML 下载到本地，再运行 `python3 scripts/import_bp_portraits.py /path/to/collection.html`。头像版权归原权利人，页面底部提供来源链接。

### 伤害演算

- 攻守角色／状态、按职业过滤饰品与星魂、魂石、套装、战阵和 Buff。
- 魂石词条、星之晶、技能参数及逐来源数值覆盖；按行恢复。
- 非暴击／暴击伤害、击杀判断、乘区拆解、面板数值。
- 防守魂石前十排行及一键换装、养成上限和超限提示。
- 移动端布局和可横向滚动的明细表。
- 配置为页面临时状态，刷新恢复默认，不上传任何数据。

## 计算口径

默认 Excel 原式，逐格复现导出文件中的公式和保存结果。

可切换的修正版仅做三处调整：D24 按双方属性查询克制矩阵；工作台 L51 与排行 V 列只累加一次 D 类免伤；伤害等于气血时视为击杀。尚未通过游戏实测验证。

其他逻辑，包括 B 乘区初始 1.1、暴伤初始 1.3、气血固定额外 40%、条件效果取表内预设、没有最小伤害钳制，均保留原表。角色切换不自动更改技能倍率，请按技能手动填写。手动覆盖的属性在切换配置后仍保留，可按行还原。

## 数据与验证

- `dist/workbook.json`：从 Excel 提取的公式、常量、上限矩阵和回归测试基准。
- `dist/engine.mjs`：确定性公式解释器，不使用 eval / Function。
- `dist/app.mjs`、`dist/style.css`、`dist/index.html`：界面与交互。
- `scripts/extract_workbook.py`：需 openpyxl，重新提取源 Excel；不写入 Excel。源表结构变化时需同步调整页面字段和测试。
- `npm test`：核对全部已保存的工作台／排行公式结果，以及克制、D 类免伤、击杀边界和角色切换。

当前不支持完整回合推进、概率暴击、自动判断技能触发条件、配置持久化或多人协作。

BP 战阵推演：根据 BWIKI 战阵列表收录 87 个由绝品／典藏英灵担任阵眼的战阵，仅展示当前盒子相关战阵。双方独立计算“已满足／仍可开启／无法开启”，待确认禁选会预演，确认、撤销和恢复进度后同步更新。配阵需不同英灵，已选英灵必须保留，并受最终 5 个上阵位限制；可补选头像是一种最少补选方案，并不保证后续不会被禁。按英灵图鉴的基础属性、职业、性别及阵眼身份判断开启条件，不模拟战中增益、技能变化或多个战阵同时生效。

更新数据：保存 Wiki 的英灵图鉴及战阵列表 HTML，依次运行 `python3 scripts/import_bp_portraits.py collection.html`、`python3 scripts/import_bp_formations.py formations.html`（后者需要 beautifulsoup4）。每条战阵保留 Wiki 来源链接。

战阵浮窗展示各阵独有特效，省略通用四维属性加成。特效来自每条战阵的 Wiki 来源页，运行 `python3 scripts/import_bp_formation_effects.py pages/` 可从缓存详情 HTML（或同名公开 API JSON）重新生成 `formation-effects.mjs`。
