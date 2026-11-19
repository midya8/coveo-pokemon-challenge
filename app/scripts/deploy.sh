#!/usr/bin/env bash
# Build the app and publish it to GitHub Pages (gh-pages branch).
#
# Credentials are injected from Bitwarden Secrets Manager, never stored in the repo:
#   bws run -- ./scripts/deploy.sh
# Without VITE_COVEO_ORG_ID / VITE_COVEO_API_KEY the build targets Coveo's public sample org.
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_URL="$(git -C .. remote get-url origin)"
REPO_NAME="$(basename -s .git "$REPO_URL")"

if [[ -z "${VITE_COVEO_ORG_ID:-}" || -z "${VITE_COVEO_API_KEY:-}" ]]; then
  echo "warning: Coveo credentials not set, building against the public sample org" >&2
fi

npm run build -- --base="/${REPO_NAME}/"
cp dist/index.html dist/404.html   # SPA fallback so /pokemon/<slug> deep links load
touch dist/.nojekyll

cd dist
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "Deploy $(git -C ../.. rev-parse --short HEAD)"
git push -q -f "$REPO_URL" gh-pages
rm -rf .git
echo "Deployed to gh-pages for ${REPO_NAME}"
