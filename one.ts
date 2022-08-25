class Input {
    file: string;
    path: string;
    data: string;

    constructor(file: string, path: string) {

    }

    setData(data: string) {
        this.data = data;
    }

    readFile() {
        // check file exists or not

    }
}

class Lexer {
    constructor(input: any) {
    }
}

function main(): void {
    console.log(`Hello!`);

    const source_code = "echo 110;";
    let tokens: Lexer = new Lexer(source_code);
    console.log(tokens);
}

main();

