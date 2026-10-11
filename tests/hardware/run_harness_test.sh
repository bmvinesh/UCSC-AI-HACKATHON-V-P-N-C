#!/usr/bin/env bash
# Tests for scripts/gx10/run.sh using dummy commands; no GPU work.
#   tests/hardware/run_harness_test.sh
set -uo pipefail

cd "$(git rev-parse --show-toplevel)"
export GX10_RUNS_DIR="$(mktemp -d)"
trap 'rm -rf "$GX10_RUNS_DIR"' EXIT
RUN=(scripts/gx10/run.sh --allow-dirty)
failures=0

check() { # description, actual, expected
  if [[ $2 == "$3" ]]; then
    echo "ok   $1"
  else
    echo "FAIL $1: got '$2', want '$3'"
    failures=$((failures + 1))
  fi
}
record() { jq -r "$2" "$GX10_RUNS_DIR"/*-"$1"/record.json; }

out="$GX10_RUNS_DIR/artifact.txt"
"${RUN[@]}" --seed 11 --out "$out" success -- bash -c "echo \$APP_SEED > '$out'; echo hello" >/dev/null
check "success exit code" "$?" 0
check "success status" "$(record success .status)" succeeded
check "seed recorded" "$(record success .seed)" 11
check "seed exported to the command" "$(cat "$out")" 11
check "output hashed" "$(record success '.outputs[0].sha256')" "$(sha256sum "$out" | cut -d' ' -f1)"
check "stdout captured" "$(cat "$GX10_RUNS_DIR"/*-success/stdout.log)" hello
check "commit recorded" "$(record success .commit)" "$(git rev-parse HEAD)"

"${RUN[@]}" failure -- bash -c "echo boom >&2; exit 3" >/dev/null
check "failure exit code" "$?" 3
check "failure status" "$(record failure .status)" failed
check "stderr captured" "$(cat "$GX10_RUNS_DIR"/*-failure/stderr.log)" boom

"${RUN[@]}" --out "$GX10_RUNS_DIR/never-written" missing-out -- true >/dev/null
check "missing output recorded as null" "$(record missing-out '.outputs[0].sha256')" null

"${RUN[@]}" interrupt -- sleep 30 >/dev/null &
harness=$!
until [[ -f $(echo "$GX10_RUNS_DIR"/*-interrupt/record.json) ]]; do sleep 0.1; done
check "record exists while running" "$(record interrupt .status)" running
"${RUN[@]}" second -- true >/dev/null 2>&1
check "second run refused while one is active" "$?" 1
kill -TERM "$harness"
wait "$harness"
check "interrupt status" "$(record interrupt .status)" interrupted
check "interrupted run is not exit 0" "$([[ $(record interrupt .exit_code) != 0 ]] && echo nonzero)" nonzero

scripts/gx10/run.sh Bad_Label -- true >/dev/null 2>&1
check "bad label rejected" "$?" 2

if [[ -n $(git status --porcelain) ]]; then
  scripts/gx10/run.sh dirty -- true >/dev/null 2>&1
  check "dirty tree refused without --allow-dirty" "$?" 1
else
  echo "skip dirty tree refused without --allow-dirty (tree is clean)"
fi

((failures == 0)) && echo "all harness checks passed" || echo "$failures harness check(s) failed"
exit "$failures"
