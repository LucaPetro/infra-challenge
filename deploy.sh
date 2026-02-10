#!/bin/bash
set -e

echo "Loading environment variables"
source load-env.sh

echo "Updating dependencies"
pnpm install

echo "Creating infrastructure"
pnpm deploy-infra

echo "Creating lambdas"
pnpm deploy-inventory