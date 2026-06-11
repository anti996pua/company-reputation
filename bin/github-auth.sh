#!/bin/bash
# GitHub 多账号管理助手
# ============================================
#
# 用法：
#   bin/github-auth.sh list              # 列出已配置的账号
#   bin/github-auth.sh use <account>     # 切换当前 shell 到指定账号
#   bin/github-auth.sh init <account>    # 初始化新账号（生成 SSH key + 配置）
#   bin/github-auth.sh push <account>    # 用指定账号 push
#
# 账号配置位置：~/.config/github/<account>/
#   token       — GitHub Personal Access Token
#   user        — GitHub 用户名
#   email       — Git 邮箱
#   ssh-key     — SSH 私钥路径
#
# ============================================

set -euo pipefail
CONFIG_DIR="$HOME/.config/github"

list_accounts() {
    echo "已配置的 GitHub 账号:"
    echo ""
    for dir in "$CONFIG_DIR"/*/; do
        [ -d "$dir" ] || continue
        local name=$(basename "$dir")
        local user=$(cat "$dir/user" 2>/dev/null || echo "?")
        local email=$(cat "$dir/email" 2>/dev/null || echo "?")
        echo "  $name → $user <$email>"
    done
}

use_account() {
    local name="$1"
    local dir="$CONFIG_DIR/$name"
    [ -f "$dir/token" ] || { echo "❌ 账号 $name 未找到 token"; exit 1; }
    export GITHUB_TOKEN=$(cat "$dir/token")
    export GITHUB_ACCOUNT="$name"
    if [ -f "$dir/user" ]; then export GITHUB_USER=$(cat "$dir/user"); fi
    if [ -f "$dir/email" ]; then export GITHUB_EMAIL=$(cat "$dir/email"); fi
    echo "✅ 已切换到 GitHub 账号: $name"
    echo "   用户: ${GITHUB_USER:-?}  邮箱: ${GITHUB_EMAIL:-?}"
}

init_account() {
    local name="$1"
    local dir="$CONFIG_DIR/$name"
    mkdir -p "$dir"
    echo ""
    echo "初始化 GitHub 账号: $name"
    echo "================================"
    read -p "GitHub 用户名: " user
    read -p "GitHub 邮箱: " email
    echo "$user" > "$dir/user"
    echo "$email" > "$dir/email"
    read -sp "GitHub Token (ghp_...): " token
    echo
    echo "$token" > "$dir/token"
    chmod 600 "$dir/token"
    echo "✅ Token 已保存到 $dir/token"
    echo ""
    echo "可选：生成 SSH key 用于免密 git 操作"
    read -p "是否生成 SSH key? (y/n) " yesno
    if [ "$yesno" = "y" ]; then
        local keyfile="$HOME/.ssh/id_github_$name"
        ssh-keygen -t ed25519 -C "$email" -f "$keyfile" -N ""
        echo "$keyfile" > "$dir/ssh-key"
        echo ""
        echo "请在 GitHub 添加此公钥:"
        echo "  Settings → SSH and GPG keys → New SSH key"
        echo ""
        cat "${keyfile}.pub"
        echo ""
        echo "然后配置 ~/.ssh/config:"
        echo "  Host github-$name"
        echo "    HostName github.com"
        echo "    User git"
        echo "    IdentityFile $keyfile"
    fi
}

push_with_account() {
    local name="$1"
    local dir="$CONFIG_DIR/$name"
    [ -f "$dir/token" ] || { echo "❌ 账号 $name 未配置"; exit 1; }
    GITHUB_TOKEN=$(cat "$dir/token") git push "https://$(cat $dir/user):$(cat $dir/token)@github.com/$(cat $dir/user)/$(basename $(pwd)).git" "$@"
}

case "${1:-list}" in
    list|ls)    list_accounts ;;
    use)        use_account "${2:-}" ;;
    init)       init_account "${2:-}" ;;
    push)       shift; push_with_account "$@" ;;
    *)
        echo "用法: $0 {list|use <name>|init <name>|push <name>}"
        exit 1
        ;;
esac
