#!/bin/sh
# The Archi oracle for edited views (#127, ADR 0008): Archi 5.10 imports an
# exchange-format file that Archipelago wrote, saves the model it made of it, and
# exports that model again. What Archi saved is what Archi opens; a test holds it
# to the workspace Archipelago wrote (src/test/view-oracle.ts).
#
#   scripts/fixtures/archi-roundtrip.sh <ours.xml> <archi.archimate> [<archi.xml>]
#
# ARCHI overrides where Archi is; it defaults to ~/Applications/Archi.app, then
# /Applications, as in export-with-archi.sh.
set -eu
if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "usage: $0 <ours.xml> <archi.archimate> [<archi.xml>]" >&2
  exit 2
fi
if [ -z "${ARCHI:-}" ]; then
  ARCHI="$HOME/Applications/Archi.app/Contents/MacOS/Archi"
  [ -x "$ARCHI" ] || ARCHI="/Applications/Archi.app/Contents/MacOS/Archi"
fi
IN="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
SAVED="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
[ -f "$IN" ] || { echo "no such file: $1" >&2; exit 2; }
[ -x "$ARCHI" ] || { echo "Archi not found at $ARCHI; set ARCHI=" >&2; exit 2; }
# Archi writes into a scratch directory, and the outputs replace the checked-in
# ones only when both exist: a failed run leaves the fixtures as they were.
# Archi's command line exits 0 when an import fails, so existence is the test.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
if [ "$#" -eq 3 ]; then
  EXPORTED="$(cd "$(dirname "$3")" && pwd)/$(basename "$3")"
  "$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
    --xmlexchange.import "$IN" \
    --saveModel "$TMP/saved.archimate" \
    --xmlexchange.export "$TMP/exported.xml" \
    --xmlexchange.exportFolders \
    --xmlexchange.exportLang en
  [ -s "$TMP/saved.archimate" ] || { echo "Archi could not import $1: no model saved" >&2; exit 1; }
  [ -s "$TMP/exported.xml" ] || { echo "Archi saved the model but wrote no export: $3" >&2; exit 1; }
  mv "$TMP/exported.xml" "$EXPORTED"
else
  "$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
    --xmlexchange.import "$IN" \
    --saveModel "$TMP/saved.archimate"
  [ -s "$TMP/saved.archimate" ] || { echo "Archi could not import $1: no model saved" >&2; exit 1; }
fi
mv "$TMP/saved.archimate" "$SAVED"
# The save is evidence about one input only. Its hash goes beside the save, and
# the test checks that the input checked in is still that one (#139 review).
shasum -a 256 "$IN" | cut -d' ' -f1 >"$SAVED.input-sha256"
