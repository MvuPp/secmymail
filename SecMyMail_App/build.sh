#!/bin/bash

OUTPUT="build/secmymail.xpi"

mkdir -p "$(dirname "$OUTPUT")"
rm -f "$OUTPUT"

if zip -r "$OUTPUT" . -x "build/*" ".gitignore" "build.sh" "README.md" "LICENSE.txt" ".git/*" ; then
    echo -e "\nBuild successful. The add-on has been created in $OUTPUT"
else
    echo -e "\e[31m\nBuild failed\e[0m"
fi