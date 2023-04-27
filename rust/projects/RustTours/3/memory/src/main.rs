// 代数的データ型（algebraic data types)
// enumやstructなど、複数の値のいずれかが取られる可能性があるデータ型

// 構造体（※1）
// フィールド（※2）の集合
// ※1  メモリ上で隣り合うデータの配置をコンパイラに教える役割（インスタンス化する際に隣り合うように作成する）
// ※2  データ構造とキーワードを紐付ける値
struct SeaCreature {
    animal_type: String,
    name: String,
    arms: i32,
    legs: i32,
    weapon: String,
}

struct EnumSeaCreature {
    species: Species,
    name: String,
    arms: i32,
    legs: i32,
    weapon: String,
}

// タプルライクな構造体
struct Location(i32, i32);

// unitライクな構造体
struct Marker;

// 列挙型（tagged-union）
// 一個もしくは複数のデータ型を持てる（C言語のunionな表現が可能）
// matchでパターンマッチングを行う際、各データを変数にバインドできる
// メモリ事情
// メモリサイズは、最大要素のメモリサイズと等しい
// 要素の型以外に、各要素には数字値がついている
enum Species {
    Crab,
    Octopus,
    Fish,
    Clam
}


fn main() {
    // メモリの種類
    
    // データメモリ
    // 固定長 or スタティック（プログラムのライフサイクルで常に存在するもの）
    // 非常に高速に利用できる
    // メモリ上の位置を知っている & 固定長のため、コンパイラがチューニング可能

    // スタックメモリ
    // 関数内で宣言されている変数
    // 非常に高速に利用できる
    // メモリ上の位置が変わらないため、コンパイラがチューニング可能

    // ヒープメモリ
    // プログラムの実行時に作られるデータ
    // 様々な操作が可能
    // 追加：allocation、削除：deallocation

    struct_function();
    tuple_like_struct_function();
    unit_like_struct_function();

    enum_function();
}

fn struct_function() {
    // ferrisはスタックに入る
    // 各フィールドもスタックに入る
    // "crab"などはデータメモリに入る
    // フィールド内の構造体は隣り合う形でスタックに入れる
    // 1. ヒープ に変更可能なメモリを作り、テキストを入れる
    // 2. 1.で作成した参照アドレスを ヒープ に保存し、それを String構造体 に保存
    let ferris = SeaCreature {
        animal_type: String::from("crab"),
        name: String::from("Ferris"),
        arms: 2,
        legs: 4,
        weapon: String::from("claw"),
    };

    println!(
        "{} is a {}. They have {} arms, {} legs, and a {} weapon",
        ferris.name, ferris.animal_type, ferris.arms, ferris.legs, ferris.weapon
    );
}

fn tuple_like_struct_function() {
    // これもスタックに入れられる
    let loc = Location(42, 32);
    println!("{}, {}", loc.0, loc.1);
}

fn unit_like_struct_function() {
    // あまり利用されない
    let _m = Marker;
}

fn enum_function() {
    let ferris = EnumSeaCreature {
        species: Species::Crab,
        name: String::from("Ferris"),
        arms: 2,
        legs: 4,
        weapon: String::from("claw"),
    };

    // 満たしていない場合はコンパイルエラー
    match ferris.species {
        Species::Crab => println!("{} is a crab",ferris.name),
        Species::Octopus => println!("{} is a octopus",ferris.name),
        Species::Fish => println!("{} is a fish",ferris.name),
        Species::Clam => println!("{} is a clam",ferris.name),
    }
}
