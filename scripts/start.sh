#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo " Starting API Initialization..."

echo "Prisma Client Generation..."
npx prisma generate

echo " Syncing Database with Prisma schema..."
npx prisma migrate deploy

echo " Starting the server..."
if [ "$NODE_ENV" = "development" ]; then
  exec npm run dev
else
  exec npm start
fi
