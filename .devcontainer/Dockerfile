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
        autoconf \
        automake \
        bison \
        build-essential \
        libevent-dev \
        libncurses-dev \
        pkg-config \
        unzip \
        zsh \
    && rm -rf /var/lib/apt/lists/*

ENV BUN_INSTALL=/opt/bun
ENV PATH=/opt/bun/bin:/home/vscode/.cargo/bin:${PATH}

ARG TMUX_VERSION=3.4

RUN curl -fsSL "https://github.com/tmux/tmux/releases/download/${TMUX_VERSION}/tmux-${TMUX_VERSION}.tar.gz" -o /tmp/tmux.tar.gz \
    && tar -xzf /tmp/tmux.tar.gz -C /tmp \
    && cd "/tmp/tmux-${TMUX_VERSION}" \
    && ./configure \
    && make -j"$(nproc)" \
    && make install \
    && tmux -V \
    && rm -rf /tmp/tmux.tar.gz "/tmp/tmux-${TMUX_VERSION}"

RUN curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}" \
    && chmod -R a+rX /opt/bun \
    && ln -sf /opt/bun/bin/bun /usr/local/bin/bun \
    && bun --version

USER vscode

RUN rustup toolchain install 1.98.0 --component clippy --component rustfmt \
    && rustup default 1.98.0 \
    && rustc --version \
    && cargo install checkle just --locked
