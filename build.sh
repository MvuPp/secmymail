#!/bin/bash

OUTPUT="build/secmymail.xpi"
SOURCE_DIR="SecMyMail_App"

mkdir -p "$(dirname "$OUTPUT")"
rm -f "$OUTPUT"

if zip -r "$OUTPUT" "$SOURCE_DIR" ; then
    echo -e "\nBuild successful. The add-on has been created in $OUTPUT"
else
    echo -e "\e[31m\nBuild failed\e[0m"
fi