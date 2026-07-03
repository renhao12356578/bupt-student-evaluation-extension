# BUPT 一键评教 · 浏览器扩展

北京邮电大学教务系统（[jwgl.bupt.edu.cn](https://jwgl.bupt.edu.cn)）学生期末评教 Chrome 扩展：**一键自动填充、保存、提交**。

> 仅供学习交流，使用风险自负。建议在提交前核对分数与评语。

## 功能

- **一键评教**：自动进入课程列表，逐门填充 12 项评分 + 主观评语 + 文本框并保存
- **一键评教并提交**：保存完成后自动点击「提交」（提交前二次确认）
- **分数策略**：默认随机 1～2 项降为「基本符合」，其余「完全符合」，百分制约 **96～99 分**
- **跨页续跑**：利用 `chrome.storage.session` 在 `find → list → edit → list` 跳转间自动继续
- **可配置**：降级指标数、亮点、改进建议

## 安装

### 从 GitHub Release 安装（推荐）

> **不要直接安装 `.crx`**。Chrome 会报 `CRX_REQUIRED_PROOF_MISSING`，因为非 Chrome 网上应用店的 CRX 缺少 Google Publisher 签名，**拖拽/双击 CRX 在普通 Chrome 上已被禁止**。

请下载 **`.zip`**：

1. 打开 [Releases](https://github.com/renhao12356578/bupt-student-evaluation-extension/releases) → 下载 `bupt-student-evaluation-extension.zip`
2. 解压到任意文件夹
3. Chrome → `chrome://extensions/` → 开启 **开发者模式**
4. **加载已解压的扩展程序** → 选择解压后的文件夹（内含 `manifest.json` 的那一层）
5. 任意页面点扩展图标 → **一键评教**

### 开发者模式（克隆仓库）
1. 克隆本仓库
2. 打开 Chrome → `chrome://extensions/`
3. 开启右上角 **开发者模式**
4. 点击 **加载已解压的扩展程序**，选择本项目根目录
5. **任意页面**点击扩展图标 → **一键评教**（会自动打开评教页；未登录时需先在浏览器登录教务）

> 无需手动打开评教 URL，扩展会自动跳转到 `xspj_find.do` 并开始流程。

### 关于 `.crx` 文件

| 场景 | 能否用 CRX |
|------|-----------|
| 个人 Chrome，从 GitHub 下载 | ❌ 会报 `CRX_REQUIRED_PROOF_MISSING` |
| 开发者模式加载 zip/文件夹 | ✅ 推荐 |
| 企业策略（ExtensionInstallAllowlist + ExtensionInstallSources） | ✅ 可内网分发 CRX |
| 上架 Chrome Web Store 后 | ✅ 用户可直接安装 |

Release 里的 `.crx` 主要用于**固定扩展 ID 签名**与企业内网部署；个人用户请用 **zip**。

扩展**不需要编译**，打包就是一个 **zip 压缩包**，且 **`manifest.json` 必须在 zip 根目录**：

```
bupt-student-evaluation-extension.zip
├── manifest.json          ← 必须在最外层
├── popup/
├── content/
├── lib/
├── background/
└── icons/
```

### 一键打包（ZIP + CRX）

```bash
npm install          # 首次：安装 crx3
./scripts/package.sh
```

产物：

| 文件 | 说明 |
|------|------|
| `dist/bupt-student-evaluation-extension.zip` | 解压或开发者模式加载 |
| `dist/bupt-student-evaluation-extension.crx` | 企业内网分发 / 固定 ID 签名（个人 Chrome 勿直接安装） |
| `dist/extension.pem` | CRX 签名私钥（首次自动生成，**请备份**以保持扩展 ID 不变） |

**CI 固定扩展 ID**：在 GitHub 仓库 Settings → Secrets → `CRX_PRIVATE_KEY` 填入 `dist/extension.pem` 的完整内容。

### GitHub Actions 自动打包

- 推送到 `main` 或开 PR 时自动运行 [Package Extension](https://github.com/renhao12356578/bupt-student-evaluation-extension/actions)
- Artifacts 含 **zip + crx**
- 打 tag（如 `v1.1.2`）推送后 Release 附 zip 与 crx：

```bash
git tag v1.1.2
git push origin v1.1.2
```

### 三种使用形态

| 形态 | 文件 | 用途 |
|------|------|------|
| **文件夹** | 项目根目录 | 开发调试，`chrome://extensions` → 加载已解压 |
| **`.zip`** | `dist/*.zip` | 发同学、备份、上传 Chrome 网上应用店 |
| **`.crx`** | `dist/*.crx` | 企业策略内网安装（个人用户请用 zip） |

上架 [Chrome Web Store](https://chrome.google.com/webstore/devconsole) 时：上传 zip，填写说明，审核通过后用户可直接安装，**无需开发者模式**。

## 使用说明

| 按钮 | 行为 |
|------|------|
| 一键评教（保存） | 填完所有课程并保存，**不提交**；完成后可点「提交全部」 |
| 一键评教并提交 | 填完并自动提交（需确认） |
| 提交全部 | 在列表页手动提交已保存的评价 |

### 高级设置

| 参数 | 默认 | 说明 |
|------|------|------|
| 最少降级指标 | 1 | 必须 ≥1，否则触发「请不要选相同一项」 |
| 最多降级指标 | 2 | 越大分数越低 |
| 亮点 | 很好 | 高分必填 |
| 改进建议 | 空 | 低分时才必填 |

## 项目结构

```
bupt-student-evaluation-extension/
├── manifest.json          # MV3 清单
├── popup/                 # 扩展弹窗 UI
├── content/content.js     # 跨页编排逻辑
├── lib/fill.js            # 表单填充
├── lib/list.js            # 列表页工具
├── background/            # 进度转发
└── icons/
```

## 与 Cursor Skill 的关系

本扩展核心逻辑源自 [student-evaluation-bupt](https://github.com/Firefly1007/student-evaluation-bupt) Skill 中的 `fill_evaluation.js` 等脚本，打包为可在浏览器内独立运行的一键工具。

## 免责声明

本工具仅供学习交流，使用风险自负。评教结果由使用者自行负责，提交后无法修改。

## License

MIT
