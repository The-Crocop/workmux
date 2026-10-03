FROM mcr.microsoft.com/devcontainers/rust:1-bookworm

ARG BUN_VERSION=1.3.14

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        fish \
        git \
        nodejs \
        npm \
        python3 \
        python3-pip \
        python3-venv \
        tmux \
        unzip \
        zsh \
    && rm -rf /var/lib/apt/lists/*

ENV BUN_INSTALL=/opt/bun
ENV PATH=/opt/bun/bin:/home/vscode/.cargo/bin:${PATH}

RUN curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}" \
    && chmod -R a+rX /opt/bun \
    && ln -sf /opt/bun/bin/bun /usr/local/bin/bun \
    && bun --version

USER vscode

RUN rustup component add clippy rustfmt \
    && cargo install checkle just --locked
