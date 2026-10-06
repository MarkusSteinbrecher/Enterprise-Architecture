#!/bin/sh
# Save and export the Archi-authored fixtures with real Archi: load each
# .archimate model, save it back in place, so its attributes are the ones Archi
# writes (a hand edit once left one at Archi's default, which Archi omits; #100),
# then write the Open Group exchange format with the folder structure.
# claims-platform (#76, and in German for #111), relationship-attributes (#84),
# archi-coverage (#13) and text-position (#108, saved only). ARCHI defaults to
# ~/Applications/Archi.app, then /Applications; Archi 5.10.0 produced the checked-in files.
# archi-coverage fails Archi's own XSD check after export, on purpose: it holds
# shapes left at their default size, which Archi exports as w="-1" (#13).
set -eu
# Archi lives in ~/Applications on one machine and /Applications on another.
if [ -z "${ARCHI:-}" ]; then
  ARCHI="$HOME/Applications/Archi.app/Contents/MacOS/Archi"
  [ -x "$ARCHI" ] || ARCHI="/Applications/Archi.app/Contents/MacOS/Archi"
fi
DIR="$(cd "$(dirname "$0")/../../src/io/fixtures" && pwd)"
for model in claims-platform relationship-attributes archi-coverage; do
  "$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
    --loadModel "$DIR/$model.archimate" \
    --saveModel "$DIR/$model.archimate" \
    --xmlexchange.export "$DIR/$model.xml" \
    --xmlexchange.exportFolders \
    --xmlexchange.exportLang en
done
# The same model labelled in German: Archi writes every text's xml:lang from the
# one language its export is given, and a model's language must survive (#111).
"$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
  --loadModel "$DIR/claims-platform.archimate" \
  --xmlexchange.export "$DIR/claims-platform.de.xml" \
  --xmlexchange.exportFolders \
  --xmlexchange.exportLang de
# Text positions on a group, a Grouping, a box and a note (#108): saved only, and
# drawn with --html.createReport when the evidence in text-position.test.tsx is
# re-measured.
"$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
  --loadModel "$DIR/text-position.archimate" \
  --saveModel "$DIR/text-position.archimate"
# Archi's version-keyed compatibility handlers (#118). The model is saved as it
# is, then opened under each version just below and at a handler's threshold
# (and with none, which Archi reads as "" and so as older than every one), and
# saved again: each save is what Archi 5.10 made of that version. The test
# derives each input the same way, by replacing the version this save writes.
"$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
  --loadModel "$DIR/archi-compatibility.archimate" \
  --saveModel "$DIR/archi-compatibility.archimate"
TMP="$(mktemp -d)"
for version in none 2.9.9 3.0.0 3.9.9 4.0.0 4.0.1 4.0.2 4.3.9 4.4.0 4.4.1 4.4.0.1 4.9.9; do
  if [ "$version" = none ]; then
    sed 's/ version="5\.0\.0"//' "$DIR/archi-compatibility.archimate" >"$TMP/$version.archimate"
  else
    sed "s/version=\"5\.0\.0\"/version=\"$version\"/" "$DIR/archi-compatibility.archimate" >"$TMP/$version.archimate"
  fi
  "$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
    --loadModel "$TMP/$version.archimate" \
    --saveModel "$DIR/archi-compatibility/$version.archimate"
done
rm -r "$TMP"
# Archi 2.0.0's Open Day (#105), model version 1.1.1, as Archi 5.10 saves it once
# every handler has run: the evidence that a real older file reads as Archi reads it.
"$ARCHI" -application com.archimatetool.commandline.app -consoleLog -nosplash \
  --loadModel "$DIR/archi-legacy-open-day.archimate" \
  --saveModel "$DIR/archi-compatibility/open-day.archimate"
