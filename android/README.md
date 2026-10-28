# 天地劫 Android 战斗助手

面向 OPPO Find X8 / Android 16 的本地验证版。开发分支：`feature/android-assistant`。

## 已实现

- 独立 APK，中文 OCR 模型、网页配置界面和公式数据均随包提供，运行时不联网。
- MediaProjection 前台服务与可拖动、可折叠悬浮卡；每轮主动点击后最多读取 25 秒，平时不进行 OCR。
- 横屏固定底部区域识别：名称、双攻、双防、会心、当前/最大气血。
- 双帧核对、百分比/绝对气血切换、目标切换隔离；气血缺失不会继承旧值。
- 本地我方角色与多技能配置、自动按名称匹配、配置 JSON 导入导出；同名敌方可明确标记。
- 复用 H5 `Engine`，直接覆盖最终面板值，避免重复计算 Buff、配装面板加成和 Excel 固定气血加成。
- 一次展示全部已配置技能的不暴击/暴击参考值；允许提前录入明确标注的综合系数假设范围。
- 面板超过 30 秒提示刷新；手动记录实际主伤害和当次有效系数，最多保留 100 条记录。
- 从系统文件选择器导入截图测试 OCR，不需要启动屏幕采集。

## 使用

1. 安装 APK，在“我方配置”录入游戏完整名称、属性和技能。技能数值是非面板合计参数；百分比字段填写 `20` 表示 20%。
2. 先用“识别截图测试”选择横屏原图，检查姓名、攻防和气血。
3. “开启悬浮助手”，授予悬浮窗权限和本次屏幕采集授权。优先在系统授权界面选择游戏应用。
4. 游戏里查看已配置的我方角色，点“读取”；再查看敌方角色，点“读取”。只在游戏里选角色，无需再在助手中选角色和预测技能。
5. 保持底部面板可见，助手取得两帧一致数据和绝对气血后自动结束本轮。缺少绝对气血时等待其出现，25 秒后超时提示。
6. 左上悬浮卡标题可拖动、点击折叠；避免拖到屏幕底部盖住属性。结束时点“停止”，下次开启重新授权。
7. 配置修改后停止并重新开启助手，本场缓存不会跨采集会话保留。

## 当前边界（不要当作完成的实战预测器）

- **尚未完成 Buff/技能图标自动匹配及效果规则接入。** `scripts/sync_wiki.py` 可下载候选图标与来源，但不会把 Wiki 文字自动转换成公式。已取得妖佑宇韶容的 13 个候选图标，仍需截图比对与规则审核。
- 默认展示未校准参考值，未知免伤并没有被认定为零。未提供可靠约束时，不承诺实际伤害区间或必杀；可选的系数范围只是用户输入的条件假设。
- 实际伤害记录当前仅保存事件级有效系数，不会将其误当作可以跨技能复用的减伤率。自动推断、置信区间、装备推测尚未实现。
- 配置当前是角色/技能/非面板参数录入，并非完整复刻 H5 装备编辑器；已知条件效果需要使用者核对。
- 识别布局以用户提供的 2374×1080 横屏截图为基准，按比例裁剪。其他宽高比、黑边、UI 缩放需要补充样本适配。
- 敌我同名不能仅靠名字自动区分，遇到这种情况用“同名敌方”读取。未打开的属性无法获取；助手不自动操作游戏。
- 单目标、单次主伤害；不自动计算追击、反击、固定伤害、护盾和护卫。暴击栏是暴击时的伤害，不是暴击概率。
- 计算沿用现有表的伤害乘区及克制矩阵，公式与实战仍需校验。异常负值不输出伪精确结果。
- 30 秒是目标与读取超时约束，**尚未在 OPPO Find X8 上验证端到端速度、耗电或后台存活**。

## 构建与测试

需要 JDK 17、Android SDK 36、Build Tools 36.1.0；Gradle Wrapper 已锁定版本及 SHA-256。

```sh
cd android
./gradlew :app:assembleDebug :app:testDebugUnitTest
# 已启动模拟器或连接测试手机后
./gradlew :app:connectedDebugAndroidTest
```

产物：`app/build/outputs/apk/debug/app-debug.apk`。本地分享包输出到 `releases/`，不纳入 Git。

```sh
# 仓库根目录
node --test android/tests/*.test.mjs
node --test h5/tests/*.test.mjs
python3 android/scripts/sync_wiki.py --page 妖佑宇韶容 --limit 16
```

`app/src/androidTest/assets` 的两张图片是用户提供的识别回归样例，仅进入测试 APK，不进入应用 APK。图片采集不会自动写入磁盘或上传。

## 架构

`CaptureService` → `PanelOcr`（本地 ML Kit）→ `PanelParser`（区域解析/多帧一致性）→ `battle.mjs` → 现有 `engine.mjs` → 悬浮卡。

配置页与无界面的计算 WebView 只允许加载打包的 appassets 域资源；禁用文件访问、外部导航和混合内容。应用清单去除了网络权限。投屏停止、锁屏、进程退出都会释放采集会话。

## 资料来源

- [Android MediaProjection](https://developer.android.com/media/grow/media-projection)
- [ML Kit 中文识别](https://developers.google.com/ml-kit/vision/text-recognition/v2/android)
- [天地劫 Wiki](https://wiki.biligame.com/tdj/首页)

Wiki 资源保留来源与版本；候选资源默认不打入 APK、不纳入 Git。未验证效果不进入实时计算。

### PVP基础模型（本地逻辑验证）

状态、证据、规则调度和地图模块位于 `app/src/main/assets/pvp/`。独立于目前的伤害预览，尚未接入客户端自动操作。

```sh
node --test android/tests/*.test.mjs
node android/scripts/demo_pvp_model.mjs
```

以上命令从仓库根目录运行。示例为人工构造的一大回合，不能替代真实回放验证。完整接口、结算顺序要求和未实现边界见 [pvp-requirements.md](docs/pvp-requirements.md) 的“基础模型补强”。

效果实现覆盖清单可离线重建：

```sh
python3 android/scripts/build_effect_inventory.py
node --test android/tests/*.test.mjs
```

`docs/reviewed-effect-rules.json` 是人工审查记录，`docs/effect-implementation-inventory.json` 是生成的覆盖清单。`partial` 只表示部分原语可用，不表示技能可以完整施放。治疗/驱散的底层事务在 `recovery.mjs`；实际施放还必须校验配装、目标、冷却并接入角色/装备反应和行动结束。

治疗公式实测候选比较（不会自动修改战斗公式）：

```sh
python3 android/scripts/check_healing_samples.py android/docs/healing-experiment.json
```

模板未填实测前会输出 `no_usable_samples`。气愈之术的行动接线在 `healing-skill.mjs`，仍须提供当前局面的已验证治疗数值与角色/装备规则；不能把合成测试当实战公式验证。

回放笔记的独立时点导入与缺项检查：

```sh
node android/scripts/check_replay_evidence.mjs
```

数据文件为 `docs/replay-20261024-2145.evidence.json`。目前仍是部分观测，检查器不会将其标为可推演实战。首动前与受击后分开保存，未观察字段不继承；测试中的简化交锋也不能替代完整角色规则验证。
