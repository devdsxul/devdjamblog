# 服务器部署与备份

本项目没有连接或修改任何生产服务器。以下是交付的部署步骤；实际服务器、域名、HTTPS 和 MariaDB 运行效果仍需在部署时核验。

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

示例固定 WordPress `7.1-php8.3-apache`，数据库为 MariaDB `11.4`。镜像标签存在已核实，Compose 文件做了静态检查；本机没有 Docker，未执行容器集成验证。

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

WordPress 只绑定服务器的 `127.0.0.1:8086`，数据库不开放宿主机端口。网站通过已有的反向代理和域名对外提供服务。

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

## 更新与边界

生产环境继续维护 WordPress 和必要插件的安全更新。更新专属主题或插件时先保留旧版本与数据备份，再替换项目文件并验收。由于 `wordpress-data` 是持久化目录，仅更换容器镜像标签不保证已有 WordPress 核心文件自动更新；应使用 WordPress 后台或明确的 WP-CLI 升级步骤核实实际版本。

本地已验证的是 WordPress 7.1 / PHP 8.3 / Playground SQLite 路径；MariaDB、容器持久化、正式反向代理、HTTPS、邮件找回密码和实际带宽，需要部署环境完成验证。
