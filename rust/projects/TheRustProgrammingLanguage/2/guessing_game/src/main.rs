// プレリュード
// デフォルトで、標準ライブラリに定義されているアイテムの中のいくつかを、全てのプログラムのスコープに取り込む
// nhttps://doc.rust-lang.org/std/prelude/index.html
// 使いたい型がない場合は、use文でスコープに入れる必要がある
use std::io;
use std::cmp::Ordering;
use rand::Rng;

fn main() {
    let secret_number = rand::thread_rng().gen_range(1..101);

    println!("Guess the number!");

    loop {
        println!("please input your guess.");
        
        // 関連関数 ::の後に続いている関数
        // Rustツアーには、普通にスタティックインスタンスと書いてある
        // スタティックインスタンス：型そのものに紐付くメソッド
        let mut guess = String::new();
    
        // Result型
        // 汎用のResultと、io::Resultといったサブモジュール用の特殊な型がある
        // エラー処理に関わる情報を符号化することを目的としている
        // Result型に対し、expectメソッドが定義されている
        // 列挙型（列挙子：取りうる値）を持っている
        io::stdin()
            // 参照（＆）
            // デフォルトで普遍のため &mut guessと書いて可変にする
            // コードの複数の部分が同じデータにアクセスしても、そのデータを何度もメモリにコピーしなくて済む
            // 参照は複雑な機能（訳注：一部のプログラム言語では正しく使うのが難しい機能）だが、Rustの大きな利点の一つは参照を安全かつ簡単に使用できること
            .read_line(&mut guess)
            .expect("Failed to read line");
    
        
        // 前の値を新しい値で覆い隠す（shadowする）ことが許されている
        // trimで先頭と末尾の空白、キャリッジリターンと改行文字などを削除
        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => continue,
        };
    
        // match式を使用しており、guessとsecret_numberの値に対してcmpを呼んだ結果返されたOrderingの列挙子に基づき、次の動作を決定
        // match式は複数のアーム（腕）で構成
        match guess.cmp(&secret_number) {
            Ordering::Less => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal => {
                println!("You win!");
                break;
            }
        }
    }
}
