FROM debian:13-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    tar \
    gzip \
    xz-utils \
    bash \
    procps \
    git \
    openssh-client \
    sudo \
    gosu \
    locales \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Setup locale UTF-8
RUN echo "en_US.UTF-8 UTF-8" > /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# Install ttyd binary
ARG TTYD_VERSION=1.7.7
RUN curl -fsSL -o /usr/local/bin/ttyd https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.x86_64 \
    && chmod +x /usr/local/bin/ttyd

# Install zellij binary
ARG ZELLIJ_VERSION=v0.45.1
RUN curl -fsSL https://github.com/zellij-org/zellij/releases/download/${ZELLIJ_VERSION}/zellij-x86_64-unknown-linux-musl.tar.gz | tar -xz -C /usr/local/bin \
    && chmod +x /usr/local/bin/zellij

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /home/hermes
EXPOSE 8090

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
