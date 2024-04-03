#!/bin/bash
# 一行に二つのURLが含まれる場合、改行

# カレントディレクトリ内の4桁の数字で名前が付けられたディレクトリを検索（xxxxなどの形式）
# for dir in $(find -E . -maxdepth 1 -type d -regex '.*/[0-9]{4}$'); do
#   # ディレクトリ名から"./"を削除
#   dir_name=$(basename "$dir")
#   # 出力ファイルを初期化
#   >"${dir_name}_sorted_unique_output.txt"
#   # ディレクトリ内の.txtファイルの内容を結合し、ソートして重複を削除し、結果をファイルに保存
#   find "$dir" -name "*.txt" -exec sh -c 'cat {}; echo' \; | grep '.' | sort | uniq > "${dir_name}_sorted_unique_output.txt"
#   echo "${dir_name} done"
# done

# カレントディレクトリ内の4桁の数字で名前が付けられたディレクトリを検索（filtered_xxxxなどの形式）
for dir in $(find -E . -maxdepth 1 -type d -regex '.*/filtered_[0-9]{4}$'); do
    # ディレクトリ名から"./"を削除
    dir_name="$(basename "$dir")"

    # filtered_2024以外の場合は処理をスキップ
    # if [ "$dir_name" != "filtered_2023" ]; then
    #     continue
    # fi

    # 対象ディレクトリ内の全.txtファイルに対してループ
    find "$dir_name" -type f -name "*.txt" | while read -r file; do
        # 'https://' もしくは 'http://' の前に改行を挿入します。ただし、行の先頭にある場合は除きます。
        sed -i.bak -E 's#(https?://)#\n\1#g' "$file"
        
        # 行の先頭に不要な改行が挿入された場合は、それを削除します。
        sed -i.bak '/^$/d' "$file"
        
        # バックアップファイル(.bak)を削除します。
        rm "${file}.bak"
    done
done;


# 単体（xxxxなどの形式）
# dir="2021"
# # ディレクトリ名から"./"を削除
# dir_name=$(basename "$dir")
# # 出力ファイルを初期化
# >"${dir_name}_sorted_unique_output.txt"
# # ディレクトリ内の.txtファイルの内容を結合し、ソートして重複を削除し、結果をファイルに保存
# find "$dir" -name "*.txt" -exec sh -c 'cat {}; echo' \; | grep '.' | sort | uniq > "${dir_name}_sorted_unique_output.txt"
# echo "${dir_name} done"

# 単体（filtered_xxxxなどの形式）
# dir="filtered_2024"
# # ディレクトリ名から"./"を削除
# dir_name="$(basename "$dir")"
# output_file_name=${dir_name}_sorted_unique_output.txt
# # 出力ファイルを初期化
# >"$output_file_name"
# # ディレクトリ内の.txtファイルの内容を結合し、ソートして重複を削除し、結果をファイルに保存
# find "$dir" -name "*.txt" -exec sh -c 'cat {}; echo' \; | grep '.' | sort | uniq > "$output_file_name"
# echo "${dir_name} done"
