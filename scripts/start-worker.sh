#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting Worker Initialization..."

echo "Prisma Client Generation..."
npx prisma generate

echo "Starting the worker..."
if [ "$NODE_ENV" = "development" ]; then
  exec npm run dev:worker
else
  exec npm run start:worker
fi
