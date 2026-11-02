# dsh-workbench

DSH（DeepSeek Harness）本地工作台上自用的工具与 skill 合集。每个目录都是一个可独立运行的能力单元，核心原则：**不依赖 GUI、不依赖抓包、能离线复现的就离线复现**。

## 目录

| 路径 | 说明 |
|---|---|
| `skills/coolapk/` | 酷安客户端：本地签发 `X-App-Token` v3，纯 HTTP 访问 `api.coolapk.com`，不装 App、不登录、不解 TLS |

## skills/coolapk

酷安 App 的接口鉴权只有一个门槛——请求头里的 `X-App-Token`，而它是**客户端本地算出来的**。把算法复刻出来，就不需要抓包、不需要证书、不需要 hook。

```sh
cd skills/coolapk

node ck.mjs hot                    # 首页推荐流
node ck.mjs search 关键词 [页码]     # 搜索动态
node ck.mjs feed <id>              # 帖子详情
node ck.mjs replies <id> [页码]     # 评论列表
```

零外部依赖（`bcryptjs` 已内联在 `vendor/`），只要有 node 就能跑。

### 签名算法

```
app_code = 2609291                              # X-App-Code，对应 App 16.6.4
md5_device = md5(X-App-Device)
ts = 服务端当前 unix 秒
segment = b64decode(AUTH_BLOB[((ts+app_code)%100)*4+128 : +128])     # 96 字节
plain   = "com.coolapk.market&" + segment + "&" + md5_device + "&" + ts + "&" + app_code
password = md5(base64(plain))                   # base64 保留 = padding
salt    = base64(hex(ts) + "/" + md5(plain))[:22]
salt[21] = "./A-Za-z0-9"[index_of(salt[21]) & 0x30]
token   = "v3" + base64(bcrypt(password, "$2y$04$" + salt))          # 去掉 padding
```

`AUTH_BLOB` 是 930 字节签名表，见 `consts.json`。

### 三个坑

1. **base64 padding**：`password` 那步必须用带 `=` 的标准 base64，只有最终 token 才去 padding。去早了返回 `{"status":1004,"message":"请求验证错误"}`。
2. **时间**：ts 用本机时间即可。差太多时服务端返回 `1005`，并且**会把 token 里解出的时间原样告诉你**——等于免费校时接口。
3. **裸请求**是 `403` 且 body 长度为 0，那是缺签名，不是 IP 被封。

### 已知接口

`/v6/main/init`、`/v6/main/indexV8`、`/v6/search`、`/v6/feed/detail`、`/v6/feed/replyList`、
`/v6/topic/feedList`、`/v6/page/dataList`、`/v6/topic/newTagDetail`

- 搜索参数名是 `searchValue`（不是 keyword），`type=feed|user|product|topic`
- 详情/评论走 `api2.coolapk.com`，GET + query
- 单接口翻页上限 100 页，再多返回 403

### 边界

游客身份可读全部内容；点赞/发帖/关注需要登录 Cookie。token 实测有效期约 24h，`ck.mjs` 每次调用现签。

## License

MIT
