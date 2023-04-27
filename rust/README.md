# The Rust Programming Language 日本語版
https://doc.rust-jp.rs/book-ja/title-page.html

# Rustツアー
https://tourofrust.com/00_ja.html

## Cargo
- コードのビルド、コードが依存するライブラリのダウンロード、それらのライブラリのビルドなどを行う
```bash
cargo new [--vcs=none]
cargo build [--release]
cargo run
cargo check
# Cargo.lockを無視して、依存クレートのバージョンを更新する
cargo update
# 依存クレートが提供するドキュメントをローカルでビルドし、ブラウザで開く
cargo doc --open
```
