#!/bin/sh
# Build and publish to GitHub Pages (branch gh-pages) as a normal commit — no force-push.
# Supabase keys come from .env.local if present.
set -e
cd "$(dirname "$0")/.."
REPO=https://github.com/Nandy2312/daily-plan.git
npm run build
TMP=$(mktemp -d)
if git ls-remote --exit-code --heads "$REPO" gh-pages >/dev/null 2>&1; then
  git clone -q --depth 1 --branch gh-pages "$REPO" "$TMP"
else
  git -C "$TMP" init -q
  git -C "$TMP" checkout -q -b gh-pages
  git -C "$TMP" remote add origin "$REPO"
fi
find "$TMP" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R dist/. "$TMP"/
touch "$TMP/.nojekyll"
git -C "$TMP" add -A
if git -C "$TMP" diff --cached --quiet; then echo "Nothing changed."; else
  git -C "$TMP" commit -q -m "deploy $(date '+%Y-%m-%d %H:%M')"
  git -C "$TMP" push -q origin gh-pages
fi
rm -rf "$TMP"
echo "Deployed → https://nandy2312.github.io/daily-plan/"
