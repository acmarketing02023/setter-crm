#!/bin/bash
set -e

echo "Running Prisma migrations..."
npx prisma db push --skip-generate

echo "Seeding database..."
npx prisma db seed

echo "Build complete!"
