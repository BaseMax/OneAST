import * as fs from "fs";
import * as path from "path";

class Input {
    file: string | null = null;
    path: string | null = null;
    data: string = "";

    constructor(file?: string, path?: string) {
        this.file = file || null;
        this.path = path || null;
    }

    setData(data: string) {
        this.data = data;
    }

    readFile() {
        if (this.file && this.path) {
            const full_path = this.path + path.sep + this.file;
            console.log(full_path);
            if (fs.existsSync(full_path)) {
                this.data = fs.readFileSync(full_path, "utf8");
            } else {
                throw new Error(`File ${full_path} does not exist`);
            }
        }
    }
}

enum TokenType {
    T_ERROR=-1,
    T_EOF=0,

    T_IDENTIFIER = 1,
    T_NUMBER = 2,
    T_SEMICOLON = 3,
}

class Token {
    kind: TokenType;

    constructor(kind: TokenType) {
        this.kind = kind;
    }

    print(): string {
        return `Token(${this.kind})`;
    }
}

class Lexer {
    input: Input;
    tokens: Token[] = [];

    index: number = 0;
    offset: number = 0;
    line: number = 1;

    constructor(input: Input) {
        this.input = input;
        if (!this.input.data) {
            throw new Error("No input data");
        }
    }

    tokenize() {
        while (!this.isEOF()) {
            this.tokens.push(this.nextToken());
        }
    }

    nextToken(): Token {
        let c = this.input.data[this.index];
        let token: Token;
        if (c === " " || c === "\t" || c === "\n" || c === "\r") {
            this.index++;
            return this.nextToken();
        } else if (c === ";") {
            token = new Token(TokenType.T_SEMICOLON);
            this.index++;
        } else if (c === ".") {
            token = new Token(TokenType.T_IDENTIFIER);
            this.index++;
        } else if (c === "0" || c === "1" || c === "2" || c === "3" || c === "4" || c === "5" || c === "6" || c === "7" || c === "8" || c === "9") {
            token = new Token(TokenType.T_NUMBER);
            this.index++;
        } else {
            throw new Error(`Unexpected character ${c}`);
        }
        return token;
    }

    isEOF(): boolean {
        return this.index >= this.input.data.length;
    }
}

function main(): void {
    console.log(`Hello!`);

    // =============== Input =================
    // let input: Input = new Input("one.ts", ".");
    // input.readFile();
    let input: Input = new Input();
    const source_code = "echo 110;";
    input.setData(source_code);
    console.log(input);

    // =============== Lexer =================
    let tokens: Lexer = new Lexer(input);
    console.log(tokens);

    // =============== Parser =================

    // =============== AST =================

    // =============== Interpreter =================

    // =============== Compiler =================

    // =============== Code Generator =================

    // =============== Code Optimizer =================

    // =============== Code Compiler =================

    // =============== Code Runner =================
}

main();
