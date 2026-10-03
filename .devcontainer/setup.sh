#!/usr/bin/env bash
set -euo pipefail

python3 -m venv tests/venv
tests/venv/bin/python -m pip install --upgrade pip
tests/venv/bin/pip install -r tests/requirements.txt pyright 'ruff==0.14.4'

(
  cd docs
  bun install --frozen-lockfile
)

printf '\nworkmux devcontainer ready\n'
printf '  just check      # full static/unit/docs checks\n'
printf '  just itest      # tmux integration suite\n'
printf '  just dev-build  # build host-visible release binary\n\n'
