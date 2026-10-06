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
# Archi's command line exits 0 even when an import fails, so the save is
# removed first and its absence afterwards is the failure.
rm -f "$SAVED"
if [ "$#" -eq 3 ]; then
  EXPORTED="$(cd "$(dirname "$3")" && pwd)/$(basename "$3")"
  rm -f "$EXPORTED"
  "$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
    --xmlexchange.import "$IN" \
    --saveModel "$SAVED" \
    --xmlexchange.export "$EXPORTED" \
    --xmlexchange.exportFolders \
    --xmlexchange.exportLang en
  [ -s "$EXPORTED" ] || { echo "Archi wrote no export: $3" >&2; exit 1; }
else
  "$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
    --xmlexchange.import "$IN" \
    --saveModel "$SAVED"
fi
[ -s "$SAVED" ] || { echo "Archi saved no model: $2" >&2; exit 1; }
