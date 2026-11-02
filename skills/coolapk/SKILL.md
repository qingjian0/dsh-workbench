---
name: coolapk
description: 直接访问酷安（Coolapk）社区数据：首页推荐、搜索、帖子详情、评论、图片下载。本地离线签发 X-App-Token v3，不装 App、不登录、不抓包、不解 TLS。
whenToUse: 用户提到酷安、酷友、酷安帖子/动态/评论、科技数码社区内容检索，或要求从酷安取数据、监控帖子、批量抓图时。
---

# 酷安客户端（离线签名）

酷安 App 的全部接口都能用纯 HTTP 打到，服务端只校验请求头里的 `X-App-Token`，
而这个 token 是**客户端本地算出来的**。本 skill 复刻了这套算法，直接调 API。

## 快速命令

脚本在 `${SKILL_DIR}`（即本文件所在目录），全部用 `node` 跑：

```sh
cd "$SKILL_DIR"

node ck.mjs hot                    # 首页推荐流
node ck.mjs search 关键词 [页码]     # 搜索动态
node ck.mjs feed <id>              # 帖子详情
node ck.mjs replies <id> [页码]     # 评论列表
```

帖子 id 从 `hot` / `search` 的输出里取（形如 `id=74800423`）。

## 算法（要自己加接口时看这里）

```
app_code = 2609291                              # 即 X-App-Code，对应 App 版本 16.6.4
md5_device = md5(X-App-Device)
ts = 服务端当前 unix 秒
segment = b64decode(AUTH_BLOB[((ts+app_code)%100)*4+128 : +128])     # 96 字节
plain   = "com.coolapk.market&" + segment + "&" + md5_device + "&" + ts + "&" + app_code
password = md5(base64(plain))                   # base64 必须保留 = padding
salt    = base64(hex(ts) + "/" + md5(plain))[:22]
salt[21] = "./A-Za-z0-9"[index_of(salt[21]) & 0x30]
token   = "v3" + base64(bcrypt(password, "$2y$04$" + salt))          # 最后去掉 padding
```

`AUTH_BLOB` 是 930 字节签名表，存在 `consts.json` 里。

## 必须记住的三个坑

1. **base64 的 padding**：`password` 那步用带 `=` 的标准 base64；只有最终 token 才去 padding。
   去早了会得到 `{"status":1004,"message":"请求验证错误"}`。
2. **时间**：ts 用本机时间即可（会和服务端校时）。差太多时服务端返回 `1005`，
   并且**会把 token 里解出的时间原样告诉你**——等于免费校时接口。
3. **裸请求是 403 且 body 长度为 0**，那是缺签名，不是 IP 被封。

## 加新接口

`ck.mjs` 里 `call(url, params, method)` 已经处理好签名和重试，照着加分支即可：

- GET：`https://api.coolapk.com/v6/...`
- 详情/评论：`https://api2.coolapk.com/v6/feed/detail`、`/v6/feed/replyList`（GET + query）
- 搜索参数名是 `searchValue`（不是 keyword），`type=feed|user|product|topic`
- 已知可用：`/v6/main/init`、`/v6/main/indexV8`、`/v6/search`、`/v6/feed/detail`、
  `/v6/feed/replyList`、`/v6/topic/feedList`、`/v6/page/dataList`、`/v6/topic/newTagDetail`

## 边界

- 游客身份：读全部内容。点赞/发帖/关注需要登录 Cookie。
- token 有效期实测约 24h，`ck.mjs` 每次调用现签，无感。
- 单接口翻页上限 100 页，再多返回 403。
