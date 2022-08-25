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
    kind: string;
    value: any;

    constructor(kind: TokenType, value?: any) {
        this.kind = TokenType[kind];
        this.value = value;
    }

    print(): string {
        return `Token(${this.kind})`;
    }
}

class Location {
    index: number = 0;
    offset: number = 0;
    line: number = 1;

    constructor(index: number, offset: number, line: number) {
        this.index = index;
        this.offset = offset;
        this.line = line;
    }
}

class Lexer {
    input: Input;
    tokens: Token[] = [];

    location: Location = new Location(0, 0, 1);

    constructor(input: Input) {
        this.input = input;
        if (!this.input.data) {
            throw new Error("No input data");
        }
        this.tokenize();
    }

    tokenize() {
        while (!this.isEOF()) {
            this.tokens.push(this.nextToken());
        }
    }

    nextIndex(n: number) {
        this.location.index += n;
        this.location.offset += n;
    }

    nextToken(): Token {
        let c = this.getChar();
        console.log("nextToken: loop", c);

        if (c === null) {
            return new Token(TokenType.T_EOF);
        }
        if (c === " " || c === "\t" || c === "\n" || c === "\r") {
            this.skipWhitespace();
            return this.nextToken();
        }
        if (c === ";") {
            this.nextIndex(1);
            return new Token(TokenType.T_SEMICOLON);
        }
        if (this.isDigit(c)) {
            return this.readNumber();
        }
        if (this.isAlpha(c)) {
            return this.readIdentifier();
        }
        return new Token(TokenType.T_ERROR, `Unexpected character ${c}`);
    }

    isDigit(c: string): boolean {
        return c >= "0" && c <= "9";
    }
    
    isAlpha(c: string): boolean {
        return c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c === "_";
    }

    readNumber() : Token {
        let number = "";
        let c = this.getChar();
        
        while (c !== null && this.isDigit(c)) {
            console.log("readNumber / loop", c);
            number += c;
            c = this.nextChar();
        }

        return new Token(TokenType.T_NUMBER, number);
    }

    readIdentifier() : Token {
        let c = this.getChar();
        let identifier = "";

        while (c !== null && this.isAlpha(c)) {
            console.log("readIdentifier / loop", c);
            identifier += c;
            c = this.nextChar();
        }

        return new Token(TokenType.T_IDENTIFIER, identifier);
    }

    getChar(): string | null {
        if (this.location.index >= this.input.data.length) {
            return null;
        }
        return this.input.data[this.location.index];
    }

    nextChar(): string | null {
        this.location.index++;
        this.location.offset++;
        return this.getChar();
    }

    skipWhitespace() {
        let c = this.getChar();
        while (c === " " || c === "\t" || c === "\n" || c === "\r") {
            if (c === "\n") {
                this.location.line++;
            }
            c = this.nextChar();
        }
    }

    isEOF(): boolean {
        return this.location.index >= this.input.data.length;
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
