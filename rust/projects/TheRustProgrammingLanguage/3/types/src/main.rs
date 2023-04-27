use std::io;

fn main() {
    guess_function();

    number_function();

    // scalar

    // compound
    // tuple
    tuple_function();

    array_function();

    struct_function();
    

    // panic_function();
}


fn guess_function() {
    // let guess = "42".parse().expect("Not a number!");
    let guess: u32 = "42".parse().expect("Not a number!");

    println!("{}", guess);
}

fn number_function() {
    let a = 13u8;
    let b = 7u32;
    let c = a as u32 + b;
    println!("{}", c);

    let t = true;
    println!("{}", t as u8);
}

fn tuple_function() {
    let tup: (i32, f64, u8) = (500, 6.4, 1);
    println!("{:?}", tup);
    println!("{}", tup.0);
    // 分配
    let (x, y, z) = tup;
    println!("The value of y is: {}", y);
}

fn array_function() {
    // 配列 → 固定長、同じ型
    // ヒープよりもスタックに、または、常に固定長の要素があることを確認したい時に有効
    // ベクタ → 可変長

    let a: [i32; 5] = [1, 2, 3, 4, 5];
    let b = [3; 5];
    println!("{}", a[0]);
    println!("{}", b[0]);
}

fn panic_function() {
    let a = [1, 2, 3, 4, 5];

    println!("Please enter an array index.");

    let mut index = String::new();

    io::stdin()
        .read_line(&mut index)
        .expect("Failed to read line");

    let index: usize = index
        .trim()
        .parse()
        .expect("Index entered was not a number");

    // // 添え字が配列長より大きければ「パニック」する
    let element = a[index];

    println!(
        "The value of the element at index {} is: {}",
        index, element
    );
}

fn struct_function() {
    struct SeaCreature {
        // String は構造体である。
        animal_type: String,
        name: String,
        arms: i32,
        legs: i32,
        weapon: String,
    }
}