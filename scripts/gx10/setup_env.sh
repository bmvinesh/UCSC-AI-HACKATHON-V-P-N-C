#!/usr/bin/env bash
# Create the GX10 Python environment in the ignored .venv/ (plan slice E1).
#   scripts/gx10/setup_env.sh
# Installs scripts/gx10/requirements-gx10.txt. PyTorch comes from the CUDA wheel
# index named by TORCH_INDEX_URL; everything else comes from PyPI.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
REQ="scripts/gx10/requirements-gx10.txt"
TORCH_INDEX_URL="${TORCH_INDEX_URL:-https://download.pytorch.org/whl/cu130}"

[[ -d .venv ]] || python3 -m venv .venv
.venv/bin/python -m pip install --quiet --upgrade pip
.venv/bin/python -m pip install --quiet --extra-index-url "$TORCH_INDEX_URL" -r "$REQ"
.venv/bin/python -m pip freeze
