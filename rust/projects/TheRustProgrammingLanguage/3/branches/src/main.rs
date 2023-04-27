fn main() {
    if_expression_function();

    loop_expression_function();

    while_expression_function();

    for_expression_function();

    match_expression_function();
}

fn if_expression_function() {
    let number = 3;

    // if式の条件式と紐付けられる一連のコードは、 時としてアームと呼ばれる
    // 以下のようなケースにはmatchが有用
    if number % 4 == 0 {
        println!("number is divisible by 4");
    } else if number % 3 == 0 {
        println!("number is divisible by 3");
    } else if number % 2 == 0 {
        println!("number is divisible by 2");
    } else {
        println!("number is not divisible by 4, 3, or 2");
    }


    // 条件式はboolでなければならない
    // if number {
    //     println!("number was three");
    // }


    let condition = true;
    let number = if condition { 5 } else { 1 };

    // numberの値は、{}です
    println!("The value of number is: {}", number);
}

fn loop_expression_function() {
    let mut count = 0;
    // ループラベル
    'counting_up: loop {
        println!("count = {}", count);
        let mut remaining = 10;
        
        // ループ内にループがある場合、最も内側のループにbreakとcontinueが適用
        // ループラベルを使用することで、breakやcontinueが適用されるループを指定できる
        loop {
            println!("remaining = {}", remaining);
            if remaining == 9 {
                break;
            }
            if count == 2 {
                break 'counting_up;
            }
            remaining -= 1;
        }

        count += 1;
    }
    println!("End count = {}", count);
}

fn while_expression_function() {
    let mut number = 3;

    while number != 0 {
        println!("{}!", number);

        number -= 1;
    }

    println!("LIFTOFF!!!");
}

fn for_expression_function() {
    let a = [10, 20, 30, 40, 50];

    for element in a {
        println!("the value is: {}", element);
    }

    for x in 0..5 {
        println!("{}", x);
    }

    for x in 0..=5 {
        println!("{}", x);
    }

    // Range型
    for number in (1..4).rev() {
        println!("{}", number);
    }
    println!("LIFTOFF!!!");
}

fn match_expression_function() {
    // 別言語で言うswitch文の代わり
    // 条件を全て網羅する必要があり、breakが入らないためよさそう
    let x = 42;

    match x {
        0 => {
            println!("found zero");
        }
        // 複数の値にマッチ
        1 | 2 => {
            println!("found 1 or 2!");
        }
        // 範囲にマッチ
        3..=9 => {
            println!("found a number 3 to 9 inclusively");
        }
        // マッチした数字を変数に束縛
        matched_num @ 10..=100 => {
            println!("found {} number between 10 to 100!", matched_num);
        }
        // どのパターンにもマッチしない場合のデフォルトマッチが必須
        _ => {
            println!("found something else!");
        }
    }
}