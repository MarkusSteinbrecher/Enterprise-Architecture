#!/bin/sh
# Export the Archi-authored fixtures with real Archi: load each .archimate model,
# then write the Open Group exchange format with the folder structure.
# claims-platform (#76) and relationship-attributes (#84). ARCHI defaults to
# ~/Applications/Archi.app; Archi 5.10.0 produced the checked-in files.
set -eu
ARCHI="${ARCHI:-$HOME/Applications/Archi.app/Contents/MacOS/Archi}"
DIR="$(cd "$(dirname "$0")/../../src/io/fixtures" && pwd)"
for model in claims-platform relationship-attributes; do
  "$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
    --loadModel "$DIR/$model.archimate" \
    --xmlexchange.export "$DIR/$model.xml" \
    --xmlexchange.exportFolders \
    --xmlexchange.exportLang en
done
