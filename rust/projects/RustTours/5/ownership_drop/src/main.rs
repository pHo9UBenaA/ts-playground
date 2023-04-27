struct Foo {
    x: i32,
}

// スコープの終わりをリソースのデストラクト（※1）と解放の場所として使用
// drop = デストラクト、解放を行うこと?
// ※1: デストラクタの実行
//     デストラクタ：オブジェクトが破棄されるときに呼び出され、オブジェクトが解放される前に行う必要のある処理を行う
fn main() {
    let foo_a = Foo { x: 42 };
    let foo_b = Foo { x: 13 };

    println!("{}", foo_a.x);

    println!("{}", foo_b.x);
    // foo_b はここでドロップ
    // foo_a はここでドロップ
}


// struct Bar {
//     x: i32,
// }

// struct Foo {
//     bar: Bar,
// }

// 構造体がドロップされると、まず構造体自体がドロップされ、次にその子要素が個別に削除されます。
// fn main() {
//     let foo = Foo { bar: Bar { x: 42 } };
//     println!("{}", foo.bar.x);
//     // foo が最初にドロップ
//     // 次に foo.bar がドロップ
// }
