fn do_something_that_might_fail(i: i32) -> Result<f32, String> {
    if i == 42 {
        Ok(13.0)
    } else {
        Err(String::from("正しい値ではありません"))
    }
}

// 等価だが、よっぽど使わなそう

// my_option.unwrap()
// match my_option {
//     Some(v) => v,
//     None => panic!("Rust によって生成されたエラーメッセージ！"),
// }

// my_result.unwrap()
// match my_result {
//     Ok(v) => v,
//     Err(e) => panic!("Rust によって生成されたエラーメッセージ！"),
// }

fn main() -> Result<(), String> {
    // 簡潔ですが、値が存在することを仮定しており、
    // すぐにダメになる可能性があります。
    let v = do_something_that_might_fail(42).unwrap();
    println!("発見 {}", v);
    
    // パニックするでしょう！
    let v = do_something_that_might_fail().unwrap();
    println!("発見 {}", v);
    
    Ok(())
}
