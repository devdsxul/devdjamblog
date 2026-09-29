# 服务器部署与备份

本文是通用安装、增量更新与备份手册；项目已有生产部署。服务器连接信息、私有路径和现场备份记录仅保存在未跟踪的 `docs/PRODUCTION.md`，不放进 Git 或发布包。

## 已核对的部署状态

2026-09-29 发布核对：

- 正式入口为 <https://xn--xmw.space/>（`殁.space`）；不带缓存参数的首页返回 200，页面引用 CSS / JS 资源版本 `3.2.2`。
- 本次部署的应用代码对应 `5f74335`，本地与远端 `main` 均已包含该提交；其后的纯文档提交不代表生产应用再次部署。详细发布凭证与验收边界记在[项目开发日志](../.trellis/workspace/devdsxul/journal-1.md)中，不能只凭提交号推断未来服务器状态。
- 现场容器为 `wordpress:7.1-php8.3-apache` 和 `mariadb:11.4`，均运行中；该版本部署后的 PHP 日志未发现错误。
- HTTP 备用入口仍保留。HTTPS 支持优先使用 AudioWorklet，非安全上下文保留 ScriptProcessor 回退；实际引擎选择仍取决于浏览器能力。
- 此轮新增的是无缓存参数的入口、页面资源引用与容器状态核对；复用了同一提交的语法检查、20 项输入回归、发布文件身份和日志结果。手机真机视觉 / 触摸 / 试听、邮件找回、带宽和备份恢复演练未在本轮验证。

以下安装步骤用于新环境，不代表需要在现役站重新初始化或覆盖数据库。

## 方式一：已有 WordPress

适合服务器已经有 WordPress / PHP / 数据库的情况。官方当前推荐 PHP 8.3+、MariaDB 10.11+ 或 MySQL 8.0+ 与 HTTPS：<https://wordpress.org/about/requirements/>。

1. 在「插件 → 安装插件 → 上传插件」上传 `devdjam-core.zip` 并启用。
2. 在「外观 → 主题 → 添加主题 → 上传主题」上传 `devdjam-theme.zip` 并启用。
3. 打开「DEVDJAM / 控制室」，点击「初始化站点栏目」。这会创建或复用 Home、杂谈、链接、关于页面，并设置首页与文章页；不会改写已有页面正文。
4. 新装 WordPress 自带的 Hello world / 示例页面，可在后台确认后移入回收站。插件本身不删除现有内容。
5. 在「设置 → 固定链接」保存一次，让 `/music/`、`/beats/` 等路径生效。
6. 确认媒体上传限额、HTTPS 和文件目录写入权限，再上传第一首 Beat。

已有站点切换主题及首页前，应先备份数据库和文件。主题中的内容模型由独立插件持有；保留 `DEVDJAM Core` 插件即可继续在后台管理音乐与 Beats。

## 方式二：Docker Compose 新站

示例固定 WordPress `7.1-php8.3-apache`，数据库为 MariaDB `11.4`。现场运行状态见上方核对记录；运行中的生产服务不等于新环境安装、重启持久化及恢复演练已经通过。

把 `devdjam-server.zip` 解压到一个独立目录，例如 `/opt/devdjamblog`。目录中保留 `compose.yaml`、`wp-content/` 和 `deploy/`。

### 1. 填写环境

```bash
cp .env.example .env
```

编辑 `.env`：

| 字段 | 内容 |
| --- | --- |
| `DJ_SITE_URL` | 最终完整 HTTPS 地址，如 `https://music.example.com` |
| `DJ_PORT` | 服务器本地转发端口，默认 `8086` |
| `DJ_DB_PASSWORD` | 单独生成的数据库用户密码 |
| `DJ_DB_ROOT_PASSWORD` | 另一个数据库 root 密码 |
| `DJ_ADMIN_USER` | 你选择的管理员用户名 |
| `DJ_ADMIN_PASSWORD` | 你生成的管理员密码 |
| `DJ_ADMIN_EMAIL` | 站主管理邮箱 |

密码没有预设值，必需字段为空时会阻止启动或初始化。`.env` 不属于发布或公开文件。

### 2. 启动并初始化

```bash
docker compose up -d db wordpress
docker compose --profile tools run --rm setup
```

首次初始化会安装 WordPress、启用主题与插件、移除刚安装产生的默认示例内容、建立空白栏目，并安装中文语言包。文章和曲库为空。

如果数据库已经安装过 WordPress，初始化脚本直接退出，不更换账号、不删除内容、不覆盖站点设置。若首次初始化中途失败，先查看具体错误，再从对应步骤恢复；不要用删除数据卷的方式重试。

### 3. 接自己的 HTTPS 反向代理

WordPress 只绑定服务器的 `127.0.0.1:8086`，数据库不开放宿主机端口。网站通过已有的反向代理和域名对外提供服务。这是仓库示例的绑定方式；现场 HTTP 备用入口的实际绑定以私有运维记录为准，不直接用示例覆盖现役 Compose。

Caddy 示例：

```caddyfile
music.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8086
}
```

已有 Nginx 的站点可参考 `deploy/nginx-location.example`，把内容合入实际 HTTPS server 块。域名、证书和站点间端口冲突须按服务器现状处理。

反向代理需要保留 Host 和 `X-Forwarded-Proto`。Compose 中已让 WordPress 正确识别代理后的 HTTPS，减少后台登录重定向问题。

### 4. 现场验收

1. HTTPS 首页、音乐、Beats、杂谈、链接、关于与后台都可访问。
2. 未登录无法发布或上传文件，草稿不在公开列表中。
3. 上传一段你准备公开的短音频，确认发布、修改、移入回收站的结果。
4. 播放时切换站内栏目，声音持续；拖动进度后继续播放。
5. 用浏览器网络面板确认音频请求工作正常，测试分段请求 / 拖动后的读取。
6. 重启容器后，文章、图片和音频仍然存在。

### 上传大小

`deploy/uploads.ini` 将单文件上限设为 256 MB，请求上限为 270 MB。如果反向代理也有限额，应与之匹配。网站没有做音频转码或自适应串流，建议为网页导出压缩试听版本。

## 数据在哪里

- Compose 的 `database` 数据卷：MariaDB 数据。
- Compose 的 `wordpress-data` 数据卷：WordPress 文件、上传媒体、额外安装的插件等。
- 项目 `wp-content/themes/devdjam` 和 `wp-content/plugins/devdjam-core`：专属主题与内容插件，按只读方式挂入容器。
- 本地开发 `.runtime`：仅用于 Playground 预览和 QA，不应上传为生产站数据。

`docker compose down` 默认保留数据卷。`docker compose down -v` 会删除数据，不应用作普通重启操作。

## 备份

更新前以及定期维护时，同时保存：数据库、WordPress 文件 / uploads、专属主题插件和私有 `.env`。

下面是由你在服务器执行的手动备份示例：

```bash
mkdir -p backups
docker compose exec -T db sh -c 'exec mariadb-dump -udevdjam -p"$MARIADB_PASSWORD" --single-transaction devdjam' > backups/devdjam.sql
docker compose exec -T wordpress tar -C /var/www/html -czf - wp-content > backups/wp-content.tar.gz
```

在没有上传或发布操作的时段备份文件，使数据库与媒体保持一致。把备份复制到另一处存储，并在独立实例试过恢复，才算完成备份验证。

## 增量发布与回滚

1. 先只读核对目标分支、远端提交、线上目标文件、服务与正式 URL。列明本轮文件清单和回滚方案，再取得生产写入授权；出现线上独有修改时先停下。
2. 从**已提交的版本**导出待发布文件，不从带无关修改的工作区直接整目录上传。Windows 检出可能是 CRLF，部署文本统一为 LF；预检可规范化 `\r\n` 后比较，不能把换行差异当成线上被手改。可用 `git show <commit>:<path>` 取版本内容，并通过字节写入明确保留 LF，避免 shell 默认编码转换。
3. 静态资源有变动时更新 `functions.php` 中唯一的 `DEVDJAM_ASSET_VER`。这是缓存版本，不是数据库或主题升级流程。
4. 替换前备份本轮旧文件；上传到临时路径，校验字节身份并做 PHP 语法检查后逐文件原子替换。先放资源，最后切换引用新缓存版本的 `functions.php`；主题增量通常不需要重启服务。
5. 回读目标文件与本轮发布清单比对；检查**不带诊断参数的正式 URL**、它实际引用的资源版本及内容，并查看近期 PHP 日志。缓存参数 URL 只能辅助排查，不能替代正式入口验收。
6. 回滚时使用本轮备份恢复同一文件集合，资源与版本定义一起恢复，再做相同核验。文件备份只覆盖这次主题更新，不替代数据库和上传媒体备份。

发布记录应区分「已提交 / 已推送」「已部署」「正式入口已核对」和「真机已验收」。哈希仅用于本轮发布或备份身份，不对整个工作区做无关扫描。

`npm run package` 会读取当前工作区并覆盖 `dist/` 同名包；它不会自动导出 Git 提交。包内没有自动部署标记，不要因为文件名存在就把旧 ZIP 当成现役版本。重新打包前确认没有无关修改，核对产物内容后再分发。

## 更新与边界

生产环境继续维护 WordPress 和必要插件的安全更新。更新专属主题或插件时先保留旧版本与数据备份，再替换项目文件并验收。由于 `wordpress-data` 是持久化目录，仅更换容器镜像标签不保证已有 WordPress 核心文件自动更新；应使用 WordPress 后台或明确的 WP-CLI 升级步骤核实实际版本。

本地 Playground 使用 WordPress 7.1 / PHP 8.3 / SQLite；生产使用 WordPress 与 MariaDB。已核对和未覆盖的现场能力分别见上方发布记录。不要把首页可访问或容器 running 当成持久化、备份恢复、邮件与容量测试的通过凭证。
