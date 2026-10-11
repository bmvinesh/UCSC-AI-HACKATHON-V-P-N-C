#!/usr/bin/env bash
# Change gate for Praneeth's role (docs/roles/01-praneeth-frontend-gx10.md).
# Run from anywhere in the repo before and after every change:
#   scripts/gx10/change_gate.sh
# Exits non-zero when the branch or working tree breaks web/PRANEETH_PLAN.md.
# Reads git state only: it never fetches, stages or modifies anything.
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"
PLAN="web/PRANEETH_PLAN.md"
OWNED_ROOTS=(web app/telemetry scripts/gx10 tests/frontend tests/hardware)
# A change to any of these means the plan must be re-read and re-derived.
CONTRACT_PATHS=(CLAUDE.md contracts docs/CONTRACTS.md docs/GIT_AND_AGENT_WORKFLOW.md
  docs/roles/README.md docs/roles/01-praneeth-frontend-gx10.md)

cd "$(git rev-parse --show-toplevel)"
git rev-parse --verify --quiet "$BASE_REF^{commit}" >/dev/null || {
  echo "FAIL: base ref '$BASE_REF' not found; set BASE_REF" >&2
  exit 1
}

failures=0
fail() {
  echo "FAIL: $*" >&2
  failures=$((failures + 1))
}

# Ownership registry from docs/roles/README.md.
is_owned() {
  case "$1" in
    web/src/generated/*) return 1 ;; # Chaandan's generated clients
    web/* | app/telemetry/* | scripts/gx10/* | tests/frontend/* | tests/hardware/*) return 0 ;;
    *) return 1 ;;
  esac
}

mapfile -d '' -t dirty < <({
  git diff --name-only --no-renames -z
  git diff --name-only --no-renames -z --cached
  git ls-files --others --exclude-standard -z
} | sort -zu)
mapfile -d '' -t changed < <({
  git diff --name-only --no-renames -z "$BASE_REF...HEAD"
  ((${#dirty[@]})) && printf '%s\0' "${dirty[@]}"
} | sort -zu)

# 1. Every path changed on this branch or in the working tree is owned.
for path in "${changed[@]}"; do
  is_owned "$path" || fail "outside Praneeth's ownership: $path"
done

# 2. Every owned root that exists sends agents to the plan.
for root in "${OWNED_ROOTS[@]}"; do
  [[ -d $root ]] || continue
  grep -qF "$(basename "$PLAN")" "$root/CLAUDE.md" 2>/dev/null ||
    fail "$root/CLAUDE.md must point agents to $PLAN"
done

# 3. VITE_* values ship in the public bundle, so none may name a secret.
for path in "${changed[@]}"; do
  [[ $path == web/* && $path != *.md && -f $path ]] || continue
  if grep -InE 'VITE_[A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)' "$path" >&2; then
    fail "secret-like VITE_* name in $path"
  fi
done

active=()
if [[ ! -f $PLAN ]]; then
  fail "$PLAN is missing"
else
  # 4. The contract the plan was derived from has not moved on the base branch.
  baseline=$(grep -m1 '^- Contract baseline commit:' "$PLAN" | grep -oE '[0-9a-f]{40}' || true)
  if [[ -z $baseline ]] || ! git cat-file -e "$baseline^{commit}" 2>/dev/null; then
    fail "$PLAN has no valid 'Contract baseline commit'"
  else
    drift=$(git diff --name-only "$baseline" "$BASE_REF" -- "${CONTRACT_PATHS[@]}")
    [[ -z $drift ]] ||
      fail "contract changed on $BASE_REF since the plan baseline. Re-read these, update $PLAN, then bump the baseline:"$'\n'"$drift"
  fi

  # 5. Code changes belong to exactly one slice marked active in the plan.
  mapfile -t active < <(grep -E '^\| *[A-Z][0-9]+ *\|.*\| *active *\|[[:space:]]*$' "$PLAN" || true)
  code_dirty=0
  for path in "${dirty[@]}"; do
    [[ $path == "$PLAN" ]] || code_dirty=1
  done
  if ((code_dirty)) && ((${#active[@]} != 1)); then
    fail "working tree has changes but $PLAN marks ${#active[@]} slices active (need exactly 1)"
  fi
fi

# 6. Downloads and training outputs stay in ignored directories, never in owned Git paths.
MAX_BYTES="${MAX_BYTES:-5242880}"
for path in "${changed[@]}"; do
  [[ -f $path ]] || continue
  case "$path" in
    *.pt | *.pth | *.ckpt | *.safetensors | *.gguf | *.onnx | *.bin | *.nii | *.nii.gz | *.dcm)
      fail "weights or raw data in a Git path (use data/raw, artifacts/checkpoints or runtime): $path"
      ;;
  esac
  size=$(stat -c %s "$path")
  ((size <= MAX_BYTES)) || fail "$path is $size bytes, over the $MAX_BYTES limit"
done

# 7. No token literals. Only the file name is printed, never the match.
TOKEN_RE='(hf_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9_-]{20,}|Bearer [A-Za-z0-9._-]{20,})'
for path in "${changed[@]}"; do
  [[ -f $path ]] || continue
  if grep -IqE "$TOKEN_RE" "$path"; then
    fail "token-like literal in $path"
  fi
done

if ((failures)); then
  echo "change gate: $failures failure(s). Stop and fix the cause before continuing." >&2
  exit 1
fi

echo "change gate OK: ${#changed[@]} changed path(s), all inside ownership; contract baseline current."
if ((${#active[@]})); then
  printf '%s\n' "${active[@]}" |
    awk -F'|' '{gsub(/^ +| +$/, "", $2); gsub(/^ +| +$/, "", $3); print "active slice: " $2 " - " $3}'
else
  echo "active slice: none"
fi
