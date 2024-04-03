#!/bin/bash

cd /Users/r-hashimoto/Documents/git/ts-playground/cinii/_temp;

# for dir in $(find -E . -maxdepth 1 -type d -regex '.*/[0-9]{4}$'); do
for dir in $(find /Users/r-hashimoto/Documents/git/ts-playground/cinii/_temp -type f -name "*.json"); do
    # ディレクトリ名から"./"を削除
    FILE_NAME=$(basename "$dir")

    # FILE_NAMEのプレフィックスが adjust_ 以外の場合はスキップ
    if [[ "$FILE_NAME" =~ ^adjust_ ]]; then
        echo "SKIP: $FILE_NAME"
        continue
    fi

    # # cp "$FILE_NAME" "adjust_$FILE_NAME"

    # # 対象のファイル名を指定します（例: input.json）
    # # FILE_NAME="${file_prefix}_cancer_articles.json"
    # # FILE_NAME="2023_test.json"

    # 一時ファイルを作成します
    TEMP_FILE=$(mktemp)

    # 最初の行に '[' を挿入します
    echo '[' > "$TEMP_FILE"

    # 全ての行を一時ファイルに追加しますが、最後のカンマは追加しないようにします
    # MacOS の sed を使用しています。GNU sed を使用する場合は '' を削除してください
    awk 'NR > 1 { print prev } { prev = $0 } END {print $0}' "$FILE_NAME" | sed -e '$ s/,$//' >> "$TEMP_FILE"

    # 最後の行に ']' を挿入します
    echo ']' >> "$TEMP_FILE"

    # 修正した内容を元のファイルに上書きします
    mv "$TEMP_FILE" "adjust_$FILE_NAME"

    # 一時ファイルを削除します
    rm -f "$TEMP_FILE"
done
