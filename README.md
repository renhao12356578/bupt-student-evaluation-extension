# BUPT 一键评教 · 浏览器扩展

北京邮电大学教务系统（[jwgl.bupt.edu.cn](https://jwgl.bupt.edu.cn)）学生期末评教 Chrome 扩展：**一键自动填充、保存、提交**。

> 仅供学习交流，使用风险自负。建议在提交前核对分数与评语。

## 功能

- **一键评教**：自动进入课程列表，逐门填充 12 项评分 + 主观评语 + 文本框并保存
- **一键评教并提交**：保存完成后自动点击「提交」（提交前二次确认）
- **分数策略**：默认随机 1～2 项降为「基本符合」，其余「完全符合」，百分制约 **96～99 分**
- **跨页续跑**：利用 `chrome.storage.session` 在 `find → list → edit → list` 跳转间自动继续
- **可配置**：降级指标数、亮点、改进建议

## 安装（开发者模式）

1. 克隆本仓库
2. 打开 Chrome → `chrome://extensions/`
3. 开启右上角 **开发者模式**
4. 点击 **加载已解压的扩展程序**，选择本项目根目录
5. **任意页面**点击扩展图标 → **一键评教**（会自动打开评教页；未登录时需先在浏览器登录教务）

> 无需手动打开评教 URL，扩展会自动跳转到 `xspj_find.do` 并开始流程。

## 打包分发

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

### 一键打包

```bash
chmod +x scripts/package.sh
./scripts/package.sh
# 输出: dist/bupt-student-evaluation-extension.zip
```

### GitHub Actions 自动打包

- 推送到 `main` 或开 PR 时自动运行 [Package Extension](https://github.com/renhao12356578/bupt-student-evaluation-extension/actions)
- 在 Actions 页面下载 **bupt-student-evaluation-extension** artifact 即可
- 打 tag（如 `v1.1.1`）推送后会自动创建 Release 并附上 zip：

```bash
git tag v1.1.1
git push origin v1.1.1
```

### 三种使用形态

| 形态 | 文件 | 用途 |
|------|------|------|
| **文件夹** | 项目根目录 | 开发调试，`chrome://extensions` → 加载已解压 |
| **`.zip`** | `dist/*.zip` | 发同学、备份、上传 Chrome 网上应用店 |
| **`.crx`** | Chrome 打包生成 | 旧式离线安装（现在较少用，商店/zip 更常见） |

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
