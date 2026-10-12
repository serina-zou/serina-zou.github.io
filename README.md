# Serina Zou Portfolio

网站完整快照 · 2026-10-12

## 上传 GitHub

1. 解压，将这个文件夹里的全部内容放入仓库根目录。`index.html` 应直接在仓库根目录，不要只上传 ZIP。
2. 可以使用 GitHub Desktop 将这个文件夹的内容提交并 Push 到你的仓库。
3. 要作为网站打开：仓库 **Settings → Pages → Deploy from a branch**，选择 **main** 和 **/(root)**，点 Save。等待 GitHub 提供访问地址。

[GitHub Pages 官方设置说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 本地预览

在这个文件夹里运行：

```sh
python3 -m http.server 8765
```

然后打开 http://localhost:8765/ 。不需要安装 npm 依赖或执行构建。

## 内容

- `index.html`：首页
- `selected-projects.html`：项目列表和卡片预览视频
- `flobrain.html`：FloBrain case study
- `cosmos.html`：Cosmos Intelligence case study
- `other-work.html`、`about.html`、`resume.html`：其他页面
- `assets/`：网站图片、SVG、视频及其他资源，保留原始画质
- `cat/animation.html`：当前猫咪互动演示及依赖素材
- 同目录 CSS / JS：页面样式及交互

## 打包处理

保留当前网站内容与交互。仅在这个发布副本中将 Meet my cat! 的本机链接换成 `cat/animation.html`，并附带当前猫咪演示依赖。原本地工作目录未改动。
包含 `.nojekyll` 以直接提供静态文件。Google Fonts 和已有外部项目链接仍需要网络。
Garrett Comer / Shared Design Framework 等尚未完成的页面或占位内容保持现状。本包是当前工作快照，并未上传或发布。
