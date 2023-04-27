// https://twitter.com/qnighy/status/1267045385991622656?s=20
fn main() {
    let x = 5;
    let x = x + 1;

    {
        let x = x * 2;
        println!("The value of x in the inner scope is: {}", x);
    }

    println!("The value of x is: {}", x);


    // let mut spaces = "     ";
    // spaces = spaces.len();
    let spaces = "     ";
    let spaces = spaces.len();

    println!("The value of spaces is: {}", spaces);
}
