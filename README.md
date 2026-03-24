# wechat-cli

`wechat-cli` 是一个面向微信公众号素材管理场景的 Node.js 命令行工具，入口命令为 `wechat`。它会在首次需要鉴权时提示输入 `AppID` 和 `AppSecret`，并把配置持久化到本地配置文件中，后续命令自动复用稳定版 `access_token`。

## 安装

```bash
npm install -g wechat-cli
```

如果是在仓库内本地体验：

```bash
npm install
node bin/wechat.js --help
```

## 开发命令

```bash
npm test
node bin/wechat.js --help
node bin/wechat.js material --help
```

## 配置

首次执行需要鉴权的命令时，如果本地还没有配置，CLI 会提示输入：

```bash
wechat material count
```

也可以显式写入配置：

```bash
wechat config --appid <AppID> --appsecret <AppSecret>
wechat config --show
```

配置文件默认位于：

- Linux/macOS: `~/.config/wechat-cli/config.json`
- Windows: `%APPDATA%\\wechat-cli\\config.json`

## 命令概览

```bash
wechat --help
wechat --version
wechat token [--refresh] [--json]
wechat material count [--json]
wechat material add --type <image|voice|video|thumb> --file <path> [--title <title>] [--introduction <text>] [--json]
wechat material get --media-id <media_id> [--output <path>] [--json]
wechat material delete --media-id <media_id> [--json]
wechat draft add news --title <title> --content <html> --thumb-media-id <media_id> [--json]
wechat draft add newspic --title <title> --content <text> --image-media-id <media_id> [--image-media-id <media_id>] [--json]
wechat draft add --file <path|-> [--json]
```

`draft add` 的富参数模式常用字段：

- `news`: `--title` `--content|--content-file` `--thumb-media-id`
- `news` 可选补充：`--author` `--digest` `--content-source-url` `--need-open-comment` `--only-fans-can-comment` `--pic-crop-235-1` `--pic-crop-1-1`
- `newspic`: `--type newspic` `--title` `--content|--content-file` `--image-media-id`
- `newspic` 可选补充：`--need-open-comment` `--only-fans-can-comment` `--cover-crop`

## 使用示例

上传永久图片素材：

```bash
wechat material add --type image --file ./assets/cover.jpg
```

上传永久视频素材：

```bash
wechat material add \
  --type video \
  --file ./assets/intro.mp4 \
  --title "产品介绍" \
  --introduction "2 分钟快速介绍"
```

获取永久素材数量：

```bash
wechat material count
```

下载二进制素材到当前目录，未显式指定 `--output` 时会自动推断文件名：

```bash
wechat material get --media-id MEDIA_ID
```

删除永久素材：

```bash
wechat material delete --media-id MEDIA_ID
```

通过 JSON 文件新增草稿：

```bash
wechat draft add --file ./doc/examples/draft-news.json
```

也可以从标准输入读取：

```bash
cat ./doc/examples/draft-news.json | wechat draft add --file -
```

参数式创建 `news` 草稿：

```bash
wechat draft add news \
  --title "示例草稿标题" \
  --content "<p>这里填写正文内容。</p>" \
  --thumb-media-id THUMB_MEDIA_ID
```

带更多字段的 `news` 草稿：

```bash
wechat draft add news \
  --title "示例草稿标题" \
  --content-file ./doc/examples/draft-news-content.html \
  --thumb-media-id THUMB_MEDIA_ID \
  --author "wechat-cli" \
  --digest "这是摘要" \
  --content-source-url "https://example.com/original-article" \
  --need-open-comment 1 \
  --only-fans-can-comment 1 \
  --pic-crop-235-1 0.1945_0_1_0.5236 \
  --pic-crop-1-1 0.1_0_0.9_1
```

参数式创建 `newspic` 草稿：

```bash
wechat draft add newspic \
  --title "图片消息标题" \
  --content "这里只支持纯文本和部分特殊标签。" \
  --image-media-id IMAGE_MEDIA_ID_1 \
  --image-media-id IMAGE_MEDIA_ID_2
```

开发时可以先用 `--dry-run` 只看最终请求体，不真正调用微信接口：

```bash
wechat draft add news \
  --title "示例草稿标题" \
  --content "<p>这里填写正文内容。</p>" \
  --thumb-media-id THUMB_MEDIA_ID \
  --dry-run
```

## 草稿 JSON 说明

`wechat draft add` 会先把输入归一化为微信官方需要的 `{"articles":[...]}` 请求体，再调用 `draft/add`。这样开发时可以少写一层包装，支持三种输入格式：

- 单篇文章对象
- 文章数组
- 官方完整请求体对象

除此之外，`draft add` 也支持更直观的子命令式参数创建，推荐使用 `draft add news` 和 `draft add newspic`。复杂结构仍然推荐使用 `--file`。

当前仓库提供了两个可直接参考的示例：

- `doc/examples/draft-news.json`
- `doc/examples/draft-newspic.json`

`news` 类型最小示例：

```json
{
  "title": "示例草稿标题",
  "author": "wechat-cli",
  "digest": "这是一个最小可运行的草稿示例。",
  "content": "<p>这里填写正文内容。</p>",
  "content_source_url": "https://example.com/article-source",
  "thumb_media_id": "REPLACE_WITH_PERMANENT_THUMB_MEDIA_ID"
}
```

`newspic` 类型最小示例：

```json
{
  "article_type": "newspic",
  "title": "图片消息标题",
  "content": "这里只支持纯文本和部分特殊标签。",
  "image_info": {
    "image_list": [
      {
        "image_media_id": "REPLACE_WITH_PERMANENT_IMAGE_MEDIA_ID"
      }
    ]
  }
}
```

字段约束和完整结构请参考：

- `doc/draft_add.md`

如果正文较长，建议把 HTML 放进单独文件，再通过 `--content-file` 读取：

- `doc/examples/draft-news-content.html`

## 项目结构

```text
.
├── bin/
│   └── wechat.js
├── doc/
│   ├── examples/
│   └── *.md
├── src/
│   ├── commands/
│   └── lib/
└── tests/
```

结构上把命令分发、微信 API 调用、配置存储和文件处理拆开了，后续继续扩展素材列表、图文接口或更多公众号能力时，能保持入口层和业务层都比较清晰。
