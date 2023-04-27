// 以下が標準で組み込まれている
// Ok と Err を使えばどこでもインスタンスを生成可能
// enum Result<T, E> {
//     Ok(T),
//     Err(E),
// }

fn do_something_that_might_fail(i:i32) -> Result<f32,String> {
    if i == 42 {
        Ok(13.0)
    } else {
        Err(String::from("正しい値ではありません"))
    }
}

fn main() -> Result<(), String> {
    let result = do_something_that_might_fail(12);

    // match は Result をエレガントに分解して、
    // すべてのケースが処理されることを保証できます！
    // match result {
    //     Ok(v) => println!("発見 {}", v),
    //     Err(e) => println!("Error: {}",e),
    // }

    // 簡潔な表現が可能な演算子 ? が用意されている
    let v = do_something_that_might_fail(12)?;
    println!("発見 {}", v);
    Ok(())
}

// main関数もresultを返せる
// fn main() -> Result<(), String> {
//     let result = do_something_that_might_fail(12);

//     match result {
//         Ok(v) => println!("発見 {}", v),
//         Err(_e) => {
//             // エラーをうまく処理
            
//             // 何が起きたのかを説明する新しい Err を main から返します！
//             return Err(String::from("main で何か問題が起きました！"));
//         }
//     }

//     // Result の Ok の中にある unit 値によって、
//     // すべてが正常であることを表現していることに注意してください。
//     Ok(())
// }
