#!/bin/sh
# opencode Docker 自动化测试脚本
# 构建 → 启动容器 → HTTP 健康检查 → 报告 → 清理
set -e

IMAGE="company-reputation:test"
CONTAINER="cr-test-$(date +%s)"
PORT="${PORT:-8081}"
PASS=0
FAIL=0

cleanup() {
  docker stop "$CONTAINER" >/dev/null 2>&1 || true
  docker rm "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== [1/4] 构建镜像 ==="
docker build -t "$IMAGE" "$(dirname "$0")/.."

echo "=== [2/4] 启动容器 (端口 $PORT) ==="
docker run -d --name "$CONTAINER" -p "$PORT":80 "$IMAGE"

echo "=== [3/4] 健康检查 ==="
sleep 2

# 测试首页
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/")
if [ "$STATUS" = "200" ]; then
  echo "  ✅ 首页: 200"
  PASS=$((PASS + 1))
else
  echo "  ❌ 首页: $STATUS (期望 200)"
  FAIL=$((FAIL + 1))
fi

# 测试公司页面
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/c/华为.html")
if [ "$STATUS" = "200" ]; then
  echo "  ✅ 公司页: 200"
  PASS=$((PASS + 1))
else
  echo "  ❌ 公司页: $STATUS (期望 200)"
  FAIL=$((FAIL + 1))
fi

# 测试 404
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/nonexistent.html")
if [ "$STATUS" = "404" ]; then
  echo "  ✅ 404: $STATUS"
  PASS=$((PASS + 1))
else
  echo "  ❌ 404: $STATUS (期望 404)"
  FAIL=$((FAIL + 1))
fi

# 测试响应头 Content-Type
CT=$(curl -s -o /dev/null -w "%{content_type}" "http://localhost:$PORT/")
if echo "$CT" | grep -q "text/html"; then
  echo "  ✅ Content-Type: $CT"
  PASS=$((PASS + 1))
else
  echo "  ❌ Content-Type: $CT (期望 text/html)"
  FAIL=$((FAIL + 1))
fi

echo "=== [4/4] 结果 ==="
echo "  通过: $PASS, 失败: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
