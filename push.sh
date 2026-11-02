#!/bin/sh
# 用 ~/.github-token 推送（git 扩展没带 credential-store，只能显式塞 URL）
set -e
REPO="$(cd "$(dirname "$0")" && pwd)"
TOK="$(tr -d ' \n\r' < "${HOME}/.github-token")"
[ -n "$TOK" ] || { echo "no ~/.github-token"; exit 1; }
git -C "$REPO" -c safe.directory='*' push \
  "https://qingjian0:${TOK}@github.com/qingjian0/dsh-workbench.git" main:main
