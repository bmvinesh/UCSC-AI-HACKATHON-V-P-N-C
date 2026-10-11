#!/usr/bin/env bash
# Model assets on the GX10, checked against scripts/gx10/assets.lock.json (plan slice M1).
#   scripts/gx10/models.sh status   compare installed models with the lock; exit 1 on a gap
#   scripts/gx10/models.sh fetch    pull only locked assets that are missing, then verify
# Never removes, replaces or restarts anything. An installed model whose digest differs
# from the lock is reported and left alone.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
LOCK="scripts/gx10/assets.lock.json"
BASE_URL="${APP_QWEN_BASE_URL:-http://127.0.0.1:11434}"
MODE="${1:-status}"

installed_digest() {
  curl -sS -m 10 "$BASE_URL/api/tags" | jq -r --arg n "$1" '.models[] | select(.name == $n) | .digest'
}

# Prints one line per locked asset; returns 1 when any is not "ok".
status() {
  local gaps=0 name want have
  while IFS=$'\t' read -r name want; do
    have="$(installed_digest "$name")"
    if [[ -z $have ]]; then
      echo "missing   $name"
      gaps=1
    elif [[ $have != "$want" ]]; then
      echo "mismatch  $name installed=${have:0:12} locked=${want:0:12}"
      gaps=1
    else
      echo "ok        $name ${have:0:12}"
    fi
  done < <(jq -r '.assets[] | [.name, .digest] | @tsv' "$LOCK")
  return $gaps
}

case "$MODE" in
  status)
    status
    ;;
  fetch)
    while IFS=$'\t' read -r name bytes; do
      [[ -z $(installed_digest "$name") ]] || continue
      free_bytes=$(df --output=avail -B1 "${OLLAMA_MODELS:-$HOME}" | tail -1)
      ((free_bytes > bytes * 2)) || {
        echo "FAIL: not enough disk for $name ($bytes bytes)" >&2
        exit 1
      }
      echo "pulling $name ($bytes bytes)"
      ollama pull "$name"
    done < <(jq -r '.assets[] | [.name, .bytes] | @tsv' "$LOCK")
    status
    ;;
  *)
    echo "usage: $0 status|fetch" >&2
    exit 2
    ;;
esac
