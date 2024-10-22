#!/bin/bash

OUTPUT="build/secmymail.xpi"
FILES=("manifest.json" "assets" "pages" "scripts" "styles")

mkdir -p "$(dirname "$OUTPUT")"
rm -f "$OUTPUT"

if zip -r "$OUTPUT" "${FILES[@]}" ; then
    echo -e "\nBuild successful. The add-on has been created in $OUTPUT"
else
    echo -e "\e[31m\nBuild failed\e[0m"
fi