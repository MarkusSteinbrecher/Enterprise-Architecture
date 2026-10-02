#!/bin/sh
# Export the claims-platform fixture with real Archi (#76): load the .archimate
# model, then write the Open Group exchange format with the folder structure.
# ARCHI defaults to ~/Applications/Archi.app; Archi 5.10.0 produced the
# checked-in file.
set -eu
ARCHI="${ARCHI:-$HOME/Applications/Archi.app/Contents/MacOS/Archi}"
DIR="$(cd "$(dirname "$0")/../../src/io/fixtures" && pwd)"
"$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
  --loadModel "$DIR/claims-platform.archimate" \
  --xmlexchange.export "$DIR/claims-platform.xml" \
  --xmlexchange.exportFolders \
  --xmlexchange.exportLang en
