#!/bin/bash
set -e

echo "Loading environment variables"
source load-env.sh

echo "Creating infrastructure"
pnpm deploy-infra

echo "Creating shared layer"
serverless deploy --service=shared-layer

echo "Creating lambdas"
serverless deploy --service=inventory
