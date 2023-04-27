// ベクタ型
// 構造体だが、ヒープ上の固定リストへの参照を含んでいる
// デフォルトの容量で始まる
// 容量より多くの項目が追加された場合、より大きな容量の固定リストを生成して、再割り当てする

fn main() {
    // 型を明示的に指定
    let mut i32_vec = Vec::<i32>::new(); // turbofish <3
    i32_vec.push(1);
    i32_vec.push(2);
    i32_vec.push(3);

    // もっと賢く、型を自動的に推論
    let mut float_vec = Vec::new();
    float_vec.push(1.3);
    float_vec.push(2.3);
    float_vec.push(3.4);

    for number in float_vec.iter() {
        println!("{}", number);
    }

    // きれいなマクロ！
    let string_vec = vec![String::from("Hello"), String::from("World")];

    for word in string_vec.iter() {
        println!("{}", word);
    }
}
