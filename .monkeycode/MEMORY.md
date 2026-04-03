# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [代码结构|代码模式|代码生成|构建方法|测试方法|依赖关系|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

[按上述格式记录的记忆条目]

[双人对战功能设计文档位置]
- Date: 2026-04-03
- Context: Agent 在执行“根据设计文档进行开发”时发现
- Category: 代码结构
- Instructions:
  - 当前可执行的规格文档位于 `.monkeycode/specs/2026-04-03-duel-battle-system/design.md`
  - 项目尚未存在业务代码，需按该设计文档初始化前后端目录与核心模块

[后端单元测试执行方式]
- Date: 2026-04-03
- Context: Agent 在执行“继续补单元测试（先后端 RoomEngine / GameManager）”时发现
- Category: 测试方法
- Instructions:
  - 后端测试框架使用 `Vitest`
  - 推荐命令为 `npm run test --workspace backend`

[根脚本CI测试入口]
- Date: 2026-04-03
- Context: Agent 在执行“继续做1、2、3”时发现
- Category: 构建方法
- Instructions:
  - 根目录 `package.json` 提供统一测试入口 `npm run test`
  - 该入口当前转发到 `npm run test --workspace backend`

[根脚本构建入口]
- Date: 2026-04-03
- Context: Agent 在执行“补充CI构建任务”时发现
- Category: 构建方法
- Instructions:
  - 根目录统一构建命令为 `npm run build`
  - 构建流程依次执行 backend TypeScript 编译与 frontend Vite 打包

[CI工作流命名与触发策略]
- Date: 2026-04-03
- Context: Agent 在执行“将测试工作流升级为统一CI工作流并加触发过滤”时发现
- Category: 构建方法
- Instructions:
  - CI 工作流文件采用 `.github/workflows/ci.yml`
  - `push` 与 `pull_request` 使用 `paths` 过滤，仅在 `backend/**`、`frontend/**`、`package*.json`、工作流文件变更时触发

[CI并发取消策略]
- Date: 2026-04-03
- Context: Agent 在执行“为CI增加并发控制以取消过时任务”时发现
- Category: 构建方法
- Instructions:
  - CI 使用 `concurrency.group: ci-${{ github.workflow }}-${{ github.ref }}`
  - 启用 `cancel-in-progress: true` 自动取消同分支旧任务

[房间断线重连与超时策略]
- Date: 2026-04-03
- Context: Agent 在执行“补齐剩余功能并完成联调”时发现
- Category: 代码模式
- Instructions:
  - 后端使用 `InMemoryStore` 维护 `playerId -> { roomCode, socketId }` 的会话映射
  - 断线时先标记玩家离线并广播 `player:disconnected`，在 `DISCONNECT_GRACE_MS` 窗口内允许同 `playerId` 自动重连恢复
  - 超时未重连时广播 `room:closed`，并清理房间与游戏运行态
