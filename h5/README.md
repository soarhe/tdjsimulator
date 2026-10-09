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
