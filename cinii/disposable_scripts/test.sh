#!/bin/bash

cd ../;

while IFS= read -r line; do
  if ! grep -Fqxe "$line" sorted_output.txt; then
    echo "$line"
  fi
done < uniqed_output.txt
