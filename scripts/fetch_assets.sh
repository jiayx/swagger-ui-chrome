#!/usr/bin/env bash

# ================== 在这里写死要拉取的列表 ==================
# 每行 4 列：REPO_URL  REF  SUBDIR  DEST
read -r -d '' TASKS <<'EOF'
https://github.com/swagger-api/swagger-ui.git master dist swagger-ui
EOF
# ============================================================

command -v git >/dev/null || { echo "未找到 git，请先安装。"; exit 1; }

START_DIR="$(pwd)"

fetch_one() {
  local repo="$1" ref="$2" subdir="$3" dest="$4"
  echo "=== 拉取: $repo [$ref] -> $subdir => $dest ==="

  local tmp
  tmp="$(mktemp -d 2>/dev/null || mktemp -d -t sparsefetch)"
  cleanup() { rm -rf "$tmp"; }
  trap cleanup RETURN

  git clone --filter=blob:none --no-checkout "$repo" "$tmp" >/dev/null
  cd "$tmp"

  git sparse-checkout init --cone
  git sparse-checkout set "$subdir"

  git fetch --depth=1 origin "$ref" >/dev/null
  git checkout --detach FETCH_HEAD >/dev/null

  mkdir -p "$START_DIR/$dest"
  cp -a "$subdir/." "$START_DIR/$dest/"

  echo "完成 ✅  已保存到：$dest"
  cd "$START_DIR"
}

echo "开始执行固定任务列表..."
while IFS= read -r line; do
  [[ -z "${line// }" || "$line" =~ ^# ]] && continue
  REPO_URL="$(awk '{print $1}' <<<"$line")"
  REF="$(awk '{print $2}' <<<"$line")"
  SUBDIR="$(awk '{print $3}' <<<"$line")"
  DEST="$(awk '{print $4}' <<<"$line")"

  if [[ -z "$REPO_URL" || -z "$REF" || -z "$SUBDIR" || -z "$DEST" ]]; then
    echo "⚠️  配置行不完整（需要 4 列）：$line"
    continue
  fi

  fetch_one "$REPO_URL" "$REF" "$SUBDIR" "$DEST"
  echo
done <<< "$TASKS"

echo "全部完成 🎉"
