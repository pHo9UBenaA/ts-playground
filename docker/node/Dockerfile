FROM node:20.11.1

RUN curl -fsSL https://get.pnpm.io/install.sh | PNPM_VERSION=8.5.0 bash -s -- --global

ENV PATH=$PATH:/root/.local/share/pnpm

WORKDIR /workspace
