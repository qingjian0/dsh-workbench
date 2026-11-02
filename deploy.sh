#!/bin/sh
# 仓库是唯一真相：改完这里，跑一次本脚本推到 DSH 的 skill 目录
# 用法: ./deploy.sh [--commit "message"]
set -e
REPO="$(cd "$(dirname "$0")" && pwd)"
DST="${DSH_HOME:-$HOME}/skills"

[ -d "$DST" ] || mkdir -p "$DST"
rm -rf "$DST/coolapk.old"
[ -e "$DST/coolapk" ] && mv "$DST/coolapk" "$DST/coolapk.old"
cp -r "$REPO/skills/coolapk" "$DST/coolapk"
rm -rf "$DST/coolapk.old"

echo "synced  $REPO/skills/coolapk  ->  $DST/coolapk"
node "$DST/coolapk/ck.mjs" hot 2>&1 | head -2
