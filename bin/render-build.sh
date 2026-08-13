#!/usr/bin/env bash
set -o errexit
bundle install
corepack enable && pnpm install --frozen-lockfile
bin/rails assets:precompile
