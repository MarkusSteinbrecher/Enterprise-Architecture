#!/bin/sh
# An Archi model saved with images (#97). Archi saves a model that holds images
# as a zip archive of model.xml and images/ under the .archimate name. Its
# command line cannot add an image, so build-images-model.ts writes the model
# and two images, this zips them as Archi lays out an archive, and Archi 5.10
# opens that and saves it: the checked-in fixture is Archi's save, not our zip.
#
#   scripts/fixtures/archive-with-archi.sh
#
# ARCHI overrides where Archi is, as in export-with-archi.sh, which runs this.
set -eu
if [ -z "${ARCHI:-}" ]; then
  ARCHI="$HOME/Applications/Archi.app/Contents/MacOS/Archi"
  [ -x "$ARCHI" ] || ARCHI="/Applications/Archi.app/Contents/MacOS/Archi"
fi
[ -x "$ARCHI" ] || { echo "Archi not found at $ARCHI; set ARCHI=" >&2; exit 2; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/src/io/fixtures/archi-images.archimate"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
(cd "$ROOT" && npx vite-node scripts/fixtures/build-images-model.ts "$TMP/model")
(cd "$TMP/model" && zip -q -X "$TMP/input.archimate" model.xml images/logo.png images/actor.png)
"$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
  --loadModel "$TMP/input.archimate" \
  --saveModel "$TMP/saved.archimate"
# Archi's command line exits 0 when a load fails, so the save's existence is the
# test, and its signature: a model without images would be saved as plain XML.
[ -s "$TMP/saved.archimate" ] || { echo "Archi saved nothing" >&2; exit 1; }
[ "$(head -c 2 "$TMP/saved.archimate")" = "PK" ] || { echo "Archi did not save an archive" >&2; exit 1; }
mv "$TMP/saved.archimate" "$OUT"
echo "Wrote $OUT"
