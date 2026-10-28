# 星光广场（暂定名）— 横屏 3D-2.5D 虚拟社交 K 歌手游原型

纯前端、无依赖（原生 WebGL2），GLB 角色 + 骨骼动画。

## 现有内容
- 场景（用传送门连接）：星光广场 → STAR KTV 大厅 / 时尚街试衣间
- 白天 / 黄昏 / 夜晚循环（点顶部时间切换：自动 / 白天 / 黄昏 / 夜晚），霓虹夜景
- GLB 角色（`assets/girl.glb`，29 根骨骼，idle / walk / run / wave），人群随机换发色、衣服
- 摇杆 / WASD / 点击地面移动；金币拾取
- 聊天：世界 / 组队 / 家族 三个频道（现在是本地模拟）
- KTV：点歌机 + 排队 + 轮到你自动上台演唱（演示版无音频）
- 换装：发色、上衣、短裤/短裙、袜子、鞋、项圈、肤色（存本地）

## 运行
GLB 要通过 http 加载，不能直接双击 index.html。
- 本地：`python3 -m http.server 8000` 然后打开 http://localhost:8000
- GitHub Pages：仓库 Settings → Pages → Branch 选 main / root，几分钟后得到网址，手机横屏打开即可

## 结构
```
index.html        页面与 HUD
css/style.css     界面样式
js/glbchar.js     GLB 解析、骨骼蒙皮、动画混合、卡通描边渲染
js/world.js       WebGL2 场景引擎（网格、贴图、昼夜环境、天空）
js/scenes.js      三个场景（程序化生成）
js/game.js        游戏逻辑：移动、人群、聊天、点歌、换装、UI
assets/girl.glb   角色模型（之后换成你做的 GLB：保持骨骼名/部件名一致即可）
```

## 换自己的 GLB
- 部件网格按节点名区分：`Hair / Top / Shorts / Skirt / Socks / Shoes / Choker / Body / Head`，换装靠这些名字
- 动作名：`idle / walk / run / wave`
- 模型朝 +Z，单位米，身高约 1.6

## 之后要做
联网服务器（限人数）、真实聊天、K 歌音频、商店与背包、更多衣服部件、男性角色。
