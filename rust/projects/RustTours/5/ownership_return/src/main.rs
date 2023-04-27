struct Foo {
    x: i32,
}

fn do_something(foo: Foo) -> Foo {
    println!("existing do_something foo.x: {}", foo.x);
    foo
    // 所有権は外に移動
}

fn main() {
    let mut foo = Foo { x: 42 };
    // foo は所有者になる
    foo = do_something(foo);
    println!("returned do_something foo.x: {}", foo.x);
    // 関数のスコープの終端により、foo はドロップ
}
