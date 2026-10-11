#!/usr/bin/env bash
# Run one heavy GX10 job with a reproducible record (plan slice M3, invariants I13 and I14).
#   scripts/gx10/run.sh [--seed N] [--in PATH]... [--out PATH]... [--allow-dirty] LABEL -- COMMAND...
# Writes runtime/gx10/runs/<utc>-<label>/ with record.json, stdout.log, stderr.log and
# packages.txt. Refuses to start while another run holds the lock, or on a dirty tree
# unless --allow-dirty is given (the record then says so). The command runs with .venv
# first on PATH and APP_SEED set. Exit code is the command's own.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
RUNS_DIR="${GX10_RUNS_DIR:-runtime/gx10/runs}"
seed="${APP_SEED:-7}"
allow_dirty=0
inputs=()
outputs=()

while (($#)); do
  case "$1" in
    --seed) seed="$2"; shift 2 ;;
    --in) inputs+=("$2"); shift 2 ;;
    --out) outputs+=("$2"); shift 2 ;;
    --allow-dirty) allow_dirty=1; shift ;;
    *) break ;;
  esac
done
label="${1:-}"
[[ $label =~ ^[a-z0-9][a-z0-9._-]*$ && ${2:-} == "--" && $# -ge 3 ]] || {
  echo "usage: $0 [--seed N] [--in PATH]... [--out PATH]... [--allow-dirty] LABEL -- COMMAND..." >&2
  exit 2
}
shift 2

dirty=false
[[ -z $(git status --porcelain) ]] || dirty=true
if [[ $dirty == true ]] && ((!allow_dirty)); then
  echo "FAIL: working tree is dirty; commit first or pass --allow-dirty" >&2
  exit 1
fi

mkdir -p "$RUNS_DIR"
exec 9>"$RUNS_DIR/.lock"
flock -n 9 || {
  echo "FAIL: another GX10 run holds $RUNS_DIR/.lock; one heavy load at a time" >&2
  exit 1
}

run_dir="$RUNS_DIR/$(date -u +%Y%m%dT%H%M%SZ)-$label"
mkdir "$run_dir"
[[ -x .venv/bin/python ]] && export PATH="$PWD/.venv/bin:$PATH"
export APP_SEED="$seed"
python3 -m pip freeze >"$run_dir/packages.txt" 2>/dev/null || true

# Emits [{path, sha256, bytes}], with nulls for a path that does not exist.
hash_paths() {
  local path
  for path in "$@"; do
    if [[ -f $path ]]; then
      jq -n --arg p "$path" --arg h "$(sha256sum "$path" | cut -d' ' -f1)" \
        --argjson b "$(stat -c %s "$path")" '{path: $p, sha256: $h, bytes: $b}'
    else
      jq -n --arg p "$path" '{path: $p, sha256: null, bytes: null}'
    fi
  done | jq -s .
}

write_record() { # status exit_code ended_at
  jq -n --arg label "$label" --arg status "$1" --argjson exit_code "$2" \
    --arg started "$started" --arg ended "$3" --arg commit "$(git rev-parse HEAD)" \
    --argjson dirty "$dirty" --argjson seed "$seed" --arg host "$(uname -n) $(uname -m)" \
    --arg packages_sha256 "$(sha256sum "$run_dir/packages.txt" | cut -d' ' -f1)" \
    --argjson inputs "$inputs_json" --argjson outputs "$(hash_paths "${outputs[@]}")" \
    --args '{label: $label, status: $status, exit_code: $exit_code, command: $ARGS.positional,
             started_at: $started, ended_at: $ended, commit: $commit, tree_dirty: $dirty,
             seed: $seed, host: $host, packages_sha256: $packages_sha256,
             inputs: $inputs, outputs: $outputs}' -- "${command[@]}" >"$run_dir/record.json"
}

command=("$@")
inputs_json="$(hash_paths "${inputs[@]}")"
started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
# A record exists from the first moment, so a killed harness never looks like success.
write_record running null ""

interrupted=0
child=0
on_signal() {
  interrupted=1
  ((child)) && kill -TERM "$child" 2>/dev/null || true
}
trap on_signal INT TERM

# The command must not inherit the lock, or a child it leaves behind would hold it.
"${command[@]}" >"$run_dir/stdout.log" 2>"$run_dir/stderr.log" 9>&- &
child=$!
code=0
wait "$child" || code=$?
if ((interrupted)); then
  wait "$child" 2>/dev/null || true
  status=interrupted
elif ((code == 0)); then
  status=succeeded
else
  status=failed
fi

write_record "$status" "$code" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "$status (exit $code): $run_dir"
exit "$code"
