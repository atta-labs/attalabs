#!/bin/bash
# Usage: bun run db herald | bun run db vada
APP=$1

if [ -z "$APP" ]; then
  echo "Usage: bun run db <app>"
  echo "Available: herald, vada"
  exit 1
fi

APP_PATH="apps/${APP}-ai/web"

if [ ! -f "$APP_PATH/drizzle.config.ts" ]; then
  echo "Error: No drizzle config found for '$APP' (looked in $APP_PATH)"
  exit 1
fi

bun run --cwd "$APP_PATH" db:studio
