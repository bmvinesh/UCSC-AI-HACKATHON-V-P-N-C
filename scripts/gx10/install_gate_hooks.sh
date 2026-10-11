#!/usr/bin/env bash
# Makes the change gate run by itself in this checkout:
#   - git pre-commit hook: a commit is refused while the gate fails
#   - Claude Code PostToolUse hook: the gate runs after every file edit
# Both live in local, untracked files. Nothing here is committed or shared.
#   scripts/gx10/install_gate_hooks.sh
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
GATE="scripts/gx10/change_gate.sh"
[[ -x $GATE ]] || {
  echo "FAIL: $GATE is missing or not executable" >&2
  exit 1
}

hook="$(git rev-parse --git-path hooks)/pre-commit"
if [[ -e $hook ]] && ! grep -qF "$GATE" "$hook"; then
  echo "FAIL: $hook already exists and does not call the gate; merge it by hand" >&2
  exit 1
fi
mkdir -p "$(dirname "$hook")"
cat >"$hook" <<EOF
#!/usr/bin/env bash
exec "\$(git rev-parse --show-toplevel)/$GATE"
EOF
chmod +x "$hook"
echo "installed $hook"

settings=".claude/settings.local.json"
if [[ -e $settings ]]; then
  grep -qF "$GATE" "$settings" ||
    echo "NOTE: $settings exists without the gate hook; add it by hand" >&2
else
  mkdir -p .claude
  # Resolved from the working directory, so it follows a session that changes folder.
  # Exit 2 hands the gate's stderr back to the agent instead of hiding it.
  cat >"$settings" <<EOF
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "r=\$(git rev-parse --show-toplevel 2>/dev/null) || exit 0; [ -x \"\$r/$GATE\" ] || exit 0; \"\$r/$GATE\" || exit 2"
          }
        ]
      }
    ]
  }
}
EOF
  echo "installed $settings"
fi

exclude="$(git rev-parse --git-path info/exclude)"
mkdir -p "$(dirname "$exclude")"
grep -qxF "$settings" "$exclude" 2>/dev/null || echo "$settings" >>"$exclude"
echo "done. New Claude Code sessions in this checkout pick up the edit hook."
