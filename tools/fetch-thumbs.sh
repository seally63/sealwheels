#!/usr/bin/env bash
#
# fetch-thumbs.sh — pull the TikTok cover image for every car that has a videoUrl
# and save it into images/<image> so the site can show real thumbnails with no
# runtime dependency on TikTok (their cover URLs are signed and expire in ~48h,
# so we download them once and self-host).
#
# Usage:
#   ./tools/fetch-thumbs.sh          # fetch only covers that are missing
#   ./tools/fetch-thumbs.sh --force  # re-fetch every cover (e.g. you changed a video)
#
# Requires: bash, curl, python3 (all preinstalled on macOS). No npm, no build step.
#
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

FORCE="${1:-}"
mkdir -p images

# Emit "image<TAB>videoUrl" for every car that has both fields set.
python3 - "$FORCE" <<'PY' | while IFS=$'\t' read -r IMAGE VIDEO_URL; do
import json, sys
data = json.load(open("cars.json"))
for c in data["cars"]:
    img, url = c.get("image", ""), c.get("videoUrl", "")
    if img and url:
        print(f"{img}\t{url}")
PY
  OUT="images/$IMAGE"
  if [[ -f "$OUT" && "$FORCE" != "--force" ]]; then
    echo "skip   $IMAGE (already downloaded — use --force to refresh)"
    continue
  fi
  # Ask TikTok's public oEmbed endpoint for the current cover URL, then download it.
  THUMB=$(curl -s --max-time 25 "https://www.tiktok.com/oembed?url=${VIDEO_URL}" \
          | python3 -c "import sys,json; print(json.load(sys.stdin).get('thumbnail_url',''))" 2>/dev/null || true)
  if [[ -z "$THUMB" ]]; then
    echo "MISS   $IMAGE (no cover returned — card will fall back to a gradient)"
    continue
  fi
  if curl -s --max-time 30 -o "$OUT" "$THUMB" && [[ -s "$OUT" ]]; then
    echo "saved  $IMAGE"
  else
    rm -f "$OUT"
    echo "FAIL   $IMAGE (download failed — card will fall back to a gradient)"
  fi
done

echo "done."
