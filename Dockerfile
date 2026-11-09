# Stage 1: Build static Go server
FROM golang:1.24-alpine AS builder

WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download

COPY main.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o nodedeck-server main.go

# Stage 2: Minimal Debian 13 runtime
FROM debian:13-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    tmux \
    bash \
    procps \
    git \
    openssh-client \
    sshpass \
    docker-cli \
    docker-compose \
    sudo \
    gosu \
    locales \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Setup locale UTF-8
RUN echo "en_US.UTF-8 UTF-8" > /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# Starship prompt binary
COPY starship-bin /usr/local/bin/starship
RUN chmod +x /usr/local/bin/starship

# NodeDeck server binary
COPY --from=builder /build/nodedeck-server /usr/local/bin/nodedeck-server
RUN chmod +x /usr/local/bin/nodedeck-server

# Static frontend assets
COPY static /usr/share/nodedeck/static

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /home/hermes
EXPOSE 8090

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
