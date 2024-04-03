#!/bin/bash

for file in *.json; do
  echo $file;
  jq -c '.[]' $file > $file.jsonl;
done
