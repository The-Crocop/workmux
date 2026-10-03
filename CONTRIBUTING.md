# Contributing to workmux

Thanks for your interest in contributing! This guide covers development setup,
testing, and the PR process.

## Before contributing

This is a small project maintained by one person. Reviewing and testing pull
requests often takes more time than implementing a feature from scratch. Please
don't be surprised if your PR is not accepted, even if the idea itself is good.
To avoid wasted effort, open an issue first to discuss your proposed change.

## Prerequisites

- Rust toolchain (stable)
- Python 3.10+ with a virtual environment at `tests/venv/`
- [just](https://github.com/casey/just) command runner
- tmux (required for tests)
- WezTerm (optional, for testing WezTerm backend)
- Zellij (optional, for testing Zellij backend)

## Development setup

```bash
# Clone and build
git clone https://github.com/raine/workmux.git
cd workmux
cargo build

# Set up Python test environment
python -m venv tests/venv
source tests/venv/bin/activate
pip install -r tests/requirements.txt

# Install dev binary (symlinks to ~/.cargo/bin)
just install-dev
```

## Dev container (optional)

If you do not want to install the Rust/Python/Bun development toolchain on your
host, the repository includes a dev container that mirrors the CI dependencies.

It contains stable Rust with clippy/rustfmt, Python, tmux, fish/zsh, Bun 1.3.14,
`checkle`, and `just`. Its setup script creates `tests/venv/`, installs the
Python lint/type-check dependencies used by CI, and installs the documentation
dependencies.

### VS Code / Dev Container compatible editor

Open the repository in the dev container and wait for the post-create setup to
finish. Then run:

```bash
just dev-verify
```

This runs `just check-ci`, the full tmux integration suite via `just itest`,
and finally builds `target/release/workmux`.

### Docker from the command line

You can use the same environment without an editor integration:

```bash
docker build -f .devcontainer/Dockerfile -t workmux-dev .
docker run --rm -it \
  -v "$PWD:/workspaces/workmux" \
  -w /workspaces/workmux \
  workmux-dev \
  bash -lc 'bash .devcontainer/setup.sh && just dev-verify'
```

Because the repository is bind-mounted, the successful release build is left at
`target/release/workmux` on the host. On Linux, you can test that exact binary
from the host without installing the Rust/Python/Bun development dependencies.

Before opening a pull request, the expected result is:

```text
just check-ci  ✓
just itest     ✓
dev-build      ✓
```

## Running tests

Tests are written in Python using pytest and run against an isolated multiplexer
environment.

```bash
# Run unit tests
just test

# Run integration tests (tmux backend, parallel)
just itest

# Run specific integration test file
just itest tests/test_workmux_add/test_basic.py

# Run with verbose output (shows backend in test names)
just itest tests/test_agent_state.py -vvv
```

### Testing different backends

By default, tests run against **tmux only**.

```bash
# Test with WezTerm (requires WezTerm to be running)
WORKMUX_TEST_BACKEND=wezterm just itest

# Test both backends
just itest --backend=tmux,wezterm

# Run a specific backend and test file
just itest --backend=wezterm tests/test_agent_state.py -vvv
```

When running with `-vvv`, test names show the backend:

```
test_state_file_has_correct_fields[wezterm] PASSED
test_state_file_has_correct_fields[tmux] PASSED
```

**Note:** WezTerm tests are slower due to GUI mux-server overhead and worker
throttling (8 workers vs unlimited for tmux).

### Marking tmux-only tests

Some tests only make sense for tmux. Use the marker:

```python
@pytest.mark.tmux_only
def test_tmux_specific_feature():
    ...
```

## Code quality

```bash
# Run static checks, Rust lints, docs checks, and unit tests
just check

# Run integration tests
just itest

# Individual commands
just format      # Format Rust and Python
just clippy      # Lint Rust code
just ruff-check  # Lint Python tests
just pyright     # Type check Python tests
```

## Pull request guidelines

1. **Discuss first**: For large or complex changes, open an issue or discussion
   before starting work.

2. **Keep PRs focused**: One feature or fix per PR. Smaller PRs are easier to
   review.

3. **Run checks locally**: Before pushing, run `just check` and `just itest` to
   catch issues early.

4. **Test multiple backends**: If your change affects multiplexer interaction,
   test with other backends:

   ```bash
   just itest --backend=tmux,wezterm
   ```

5. **Update docs**: If adding features, update relevant documentation in `docs/`
   or `README.md`.
