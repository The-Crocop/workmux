#!/usr/bin/env bash
set -euo pipefail

python3 -m venv tests/venv
tests/venv/bin/python -m pip install --upgrade pip
tests/venv/bin/pip install -r tests/requirements.txt pyright 'ruff==0.14.4'

# checkle invokes ruff directly, so expose the venv tools in a stable PATH
# location just like CI does via GITHUB_PATH.
mkdir -p "$HOME/.local/bin"
ln -sf "$PWD/tests/venv/bin/ruff" "$HOME/.local/bin/ruff"
ln -sf "$PWD/tests/venv/bin/pyright" "$HOME/.local/bin/pyright"
ln -sf "$PWD/tests/venv/bin/pyright-langserver" "$HOME/.local/bin/pyright-langserver"

(
  cd docs
  bun install --frozen-lockfile
)

printf '\nworkmux devcontainer ready\n'
printf '  just check      # full static/unit/docs checks\n'
printf '  just itest      # tmux integration suite\n'
printf '  just dev-build  # build host-visible release binary\n\n'
