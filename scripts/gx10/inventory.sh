#!/usr/bin/env bash
# Read-only inventory of the GX10 and the installed LLM runtime (plan slice G1).
#   scripts/gx10/inventory.sh               static facts -> runtime/gx10/inventory.txt
#   scripts/gx10/inventory.sh --completion  also one small loopback completion
# Never starts, stops, pulls or replaces anything. --completion makes the runtime
# load the model, so run it inside a hardware window.
# Endpoint and model come from APP_QWEN_BASE_URL / APP_QWEN_MODEL_ID when set.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
OUT_DIR="runtime/gx10"
BASE_URL="${APP_QWEN_BASE_URL:-http://127.0.0.1:11434}"
case "$BASE_URL" in
  http://127.0.0.1:* | http://localhost:* | http://\[::1\]:*) ;;
  *)
    echo "FAIL: $BASE_URL is not a loopback URL" >&2
    exit 1
    ;;
esac
mkdir -p "$OUT_DIR"

ver() { command -v "$1" >/dev/null 2>&1 && "$@" 2>&1 | head -1 || echo "not found"; }
api() { curl -sS -m 10 "$BASE_URL$1"; }

tags="$(api /api/tags 2>/dev/null || true)"
MODEL="${APP_QWEN_MODEL_ID:-$(jq -r '[.models[].name | select(test("qwen"; "i"))][0] // empty' <<<"$tags" 2>/dev/null || true)}"

{
  echo "== machine"
  echo "arch: $(uname -m)"
  echo "kernel: $(uname -r)"
  echo "cores: $(nproc)"
  echo "ram_total_gib: $(free -g | awk '/^Mem:/ {print $2}')"
  echo "gpu: $(nvidia-smi --query-gpu=name,driver_version --format=csv,noheader 2>/dev/null || echo 'not found')"
  echo "cuda_reported_by_driver: $(nvidia-smi 2>/dev/null | grep -oE 'CUDA Version: [0-9.]+' || echo 'not reported')"
  echo "== toolchain"
  echo "python: $(ver python3 --version)"
  echo "node: $(ver node --version)"
  echo "npm: $(ver npm --version)"
  echo "git: $(ver git --version)"
  echo "ollama_cli: $(ver ollama --version)"
  echo "== llm runtime at $BASE_URL"
  if [[ -z $tags ]]; then
    echo "reachable: no"
  else
    echo "reachable: yes"
    echo "server_version: $(api /api/version | jq -r '.version // "unknown"')"
    echo "served_models:"
    jq -r '.models[] | "  \(.name) params=\(.details.parameter_size) quant=\(.details.quantization_level) format=\(.details.format) bytes=\(.size)"' <<<"$tags"
    echo "selected_model: ${MODEL:-none matching qwen}"
    echo "openai_compatible_path: /v1/chat/completions"
  fi
} | tee "$OUT_DIR/inventory.txt"

[[ ${1:-} == "--completion" ]] || exit 0
[[ -n $MODEL ]] || {
  echo "FAIL: no model to probe; set APP_QWEN_MODEL_ID" >&2
  exit 1
}

# Volatile facts go to a separate file so two inventory runs stay comparable.
{
  echo "== completion probe $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "model: $MODEL"
  echo "loaded_before: $(api /api/ps | jq -c '[.models[].name]')"
  echo "mem_available_gib_before: $(free -g | awk '/^Mem:/ {print $7}')"
  start=$(date +%s.%N)
  body=$(jq -n --arg m "$MODEL" \
    '{model: $m, stream: false, think: false, messages: [{role: "user", content: "Reply with the single word: ready"}], options: {num_predict: 16, temperature: 0}}')
  reply=$(curl -sS -m 300 "$BASE_URL/api/chat" -d "$body")
  end=$(date +%s.%N)
  echo "wall_seconds: $(awk -v a="$start" -v b="$end" 'BEGIN {printf "%.2f", b - a}')"
  echo "reply: $(jq -r '.message.content // .error // "no content"' <<<"$reply" | head -c 200)"
  echo "load_seconds: $(jq -r '(.load_duration // 0) / 1e9' <<<"$reply")"
  echo "eval_tokens: $(jq -r '.eval_count // "n/a"' <<<"$reply")"
  echo "eval_seconds: $(jq -r '(.eval_duration // 0) / 1e9' <<<"$reply")"
  echo "loaded_after: $(api /api/ps | jq -c '[.models[] | {name, size, size_vram, expires_at}]')"
  echo "mem_available_gib_after: $(free -g | awk '/^Mem:/ {print $7}')"
} | tee "$OUT_DIR/completion-probe.txt"
