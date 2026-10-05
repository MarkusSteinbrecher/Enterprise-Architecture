#!/bin/sh
# Save and export the Archi-authored fixtures with real Archi: load each
# .archimate model, save it back in place, so its attributes are the ones Archi
# writes (a hand edit once left one at Archi's default, which Archi omits; #100),
# then write the Open Group exchange format with the folder structure.
# claims-platform (#76), relationship-attributes (#84) and archi-coverage (#13). ARCHI defaults to
# ~/Applications/Archi.app; Archi 5.10.0 produced the checked-in files.
# archi-coverage fails Archi's own XSD check after export, on purpose: it holds
# shapes left at their default size, which Archi exports as w="-1" (#13).
set -eu
ARCHI="${ARCHI:-$HOME/Applications/Archi.app/Contents/MacOS/Archi}"
DIR="$(cd "$(dirname "$0")/../../src/io/fixtures" && pwd)"
for model in claims-platform relationship-attributes archi-coverage; do
  "$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
    --loadModel "$DIR/$model.archimate" \
    --saveModel "$DIR/$model.archimate" \
    --xmlexchange.export "$DIR/$model.xml" \
    --xmlexchange.exportFolders \
    --xmlexchange.exportLang en
done
