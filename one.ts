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

    T_WHITESPACE = 1,
    T_IDENTIFIER = 2,
    T_NUMBER = 3,
    T_SEMICOLON = 4,
}

class Token {
    kind: string;
    value: any;
    location: LocationInfo;
    
    constructor(kind: TokenType, location: LocationInfo, value?: any) {
        this.kind = TokenType[kind];
        this.location = location;
        this.value = value;
    }

    print(): string {
        return `Token(${this.kind})`;
    }
}

class LocationInfo {
    start_location: Location;
    end_location: Location;

    constructor(start_location?: Location, end_location?: Location) {
        this.start_location = start_location || new Location(0, 0, 1);
        this.end_location= end_location || new Location(0, 0, 1);
    }
}

class Location {
    public index: number = 0;
    public offset: number = 0;
    public line: number = 1;

    constructor(index: number, offset: number, line: number) {
        this.offset = index;
        this.index = offset;
        this.line = line;
    }
}

class Lexer {
    input: Input;
    tokens: Token[] = [];

    location: LocationInfo = new LocationInfo();

    constructor(input: Input) {
        this.input = input;
        if (!this.input.data) {
            throw new Error("No input data");
        }
        this.tokenize();
    }

    tokenize() {
        while (!this.isEOF()) {
            this.location.start_location.offset = this.location.end_location.offset;
            this.location.start_location.index = this.location.end_location.index;
            this.location.start_location.line = this.location.end_location.line;

            const token = this.nextToken();
            this.tokens.push(token);
        }
    }

    nextIndex(n: number) {
        this.location.end_location.offset += n;
        this.location.end_location.index += n;
    }

    getLocation() : LocationInfo {
        return new LocationInfo(this.location.start_location, this.location.end_location);
    }

    createToken(kind: TokenType, value?: any) {
        return new Token(kind, this.getLocation(), value);
    }

    nextToken(): Token {
        let c = this.getChar();

        if (c === null) {
            return this.createToken(TokenType.T_EOF);
        }
        if (this.isWhitespace(c)) {
            return this.readWhitespace();
        }
        if (c === ";") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_SEMICOLON);
        }
        if (this.isDigit(c)) {
            return this.readNumber();
        }
        if (this.isAlpha(c)) {
            return this.readIdentifier();
        }
        return this.createToken(TokenType.T_ERROR, `Unexpected character ${c}`);
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
            number += c;
            c = this.nextChar();
        }

        return this.createToken(TokenType.T_NUMBER, number);
    }

    readIdentifier() : Token {
        let c = this.getChar();
        let identifier = "";

        while (c !== null && this.isAlpha(c)) {
            identifier += c;
            c = this.nextChar();
        }

        return this.createToken(TokenType.T_IDENTIFIER, identifier);
    }

    getChar(): string | null {
        if (this.location.end_location.index >= this.input.data.length) {
            return null;
        }
        return this.input.data[this.location.end_location.index];
    }

    nextChar(): string | null {
        const current_c = this.getChar();

        if (current_c === "\n") {
            this.location.end_location.line++;
            this.location.end_location.offset = 0;
        } else {
            this.location.end_location.offset++;
        }

        this.location.end_location.index++;
        return this.getChar();
    }

    isWhitespace(c: string) {
        return c === " " || c === "\t" || c === "\n" || c === "\r";
    }

    readWhitespace() {
        let has_tab = false;
        let has_line = false;
        let c = this.getChar();

        while (c !== null && this.isWhitespace(c)) {
            if (has_line === false && c === "\t") has_tab = true;
            if (has_line === false && c === "\n") has_line = true;
            c = this.nextChar();
        }
        
        return this.createToken(TokenType.T_WHITESPACE, {
            has_tab: has_tab,
            has_line: has_line
        });
    }

    isEOF(): boolean {
        return this.location.end_location.index >= this.input.data.length;
    }
}

function debug(value: any): void
{
    console.log(JSON.stringify(value, null, '\t'));
}

function main(): void
{
    console.log(`Hello!`);

    // =============== Input =================
    // let input: Input = new Input("one.ts", ".");
    // input.readFile();
    let input: Input = new Input();
    // const source_code = "echo             1234567890";
    // const source_code = "abc def ghi";
    const source_code = "abc                6\ndef8ghi";
    input.setData(source_code);
    console.log(input);

    // =============== Lexer =================
    let lexer: Lexer = new Lexer(input);
    // console.log(lexer);
    // debug(lexer);
    debug(lexer.tokens);

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
