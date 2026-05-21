#!/bin/bash
set -euo pipefail

echo "Building design system tokens..."
bun run build

echo ""
echo "Publishing @chimichurricode/design-system..."
npm publish --access public --registry https://registry.npmjs.org "$@"

echo ""
echo "Done. Published $(node -p "require('./package.json').version")"
