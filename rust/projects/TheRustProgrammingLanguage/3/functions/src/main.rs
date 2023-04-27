fn main() {
    let arg = 5;
    another_function(arg);

    // 代入値を返さないため、xは束縛する値がない
    // let x = (let y = 6);

    // 何も値を返さない場合は unit と呼ばれる空のタプルを返す
    expression_function();

    let value = return_value_function(5);
    println!("{}", value);
}

// スネークケースを使うことが慣例
fn another_function(param: i32) {
    println!("The value of x is: {}", param);
}

fn expression_function() {
    // 式は終端にセミコロンを含まない（ブロックも式）
    let y = {
        let x = 3;
        x + 1
    };

    println!("The value of y is: {}", y);
}

// if、match、関数、ブロックは、セミコロンのない式を戻り値として扱う
fn return_value_function(x: i32) -> i32 {
    // 文になるためNG
    // x + 1;
    x + 1
}