import * as fs from "fs";
import * as path from "path";
import { parseArgs } from "util";

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
    T_ERROR = -1,
    T_EOF = 0,

    T_WHITESPACE = 1,
    T_IDENTIFIER = 2,

    T_NUMBER = 3,
    T_SEMICOLON = 4,
    T_COMMA = 5,

    T_PARENTHESIS_OPEN = 6,
    T_PARENTHESIS_CLOSE = 7,

    T_OPERATOR_PLUS = 8,
    T_OPERATOR_MINUS = 9,
    T_OPERATOR_MULTIPLY = 10,
    T_OPERATOR_DIVIDE = 11,
    T_OPERATOR_EQUAL = 12,

    T_ECHO,
    T_IF,
    T_ELSE,
    T_FOR,
    T_DO,
    T_WHILE,
    T_RETURN,
}

class Token {
    type: TokenType;
    kind: string;
    value: any;
    location: LocationInfo;
    
    constructor(type: TokenType, location: LocationInfo, value?: any) {
        this.type = type;
        this.kind = TokenType[type];
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
        this.index = index;
        this.offset = offset;
        this.line = line;
    }

    deep(): Location {
        return new Location(this.index, this.offset, this.line);
    }
}

class Lexer {
    input: Input;
    tokens: Array<Token> = [];
    reservedWords: Record<string, TokenType> = {
        "if": TokenType.T_IF,
        "else": TokenType.T_ELSE,
        "for": TokenType.T_FOR,
        "do": TokenType.T_DO,
        "while": TokenType.T_WHILE,
        "return": TokenType.T_RETURN,
        "echo": TokenType.T_ECHO,
    };

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
            this.location.start_location = this.location.end_location.deep();

            const token = this.nextToken();
            this.tokens.push(token);
        }
        this.location.start_location = new Location(0, 0, 1);
    }

    nextIndex(n: number) {
        this.location.end_location.offset += n;
        this.location.end_location.index += n;
    }

    getLocation() : LocationInfo {
        return new LocationInfo(this.location.start_location.deep(), this.location.end_location.deep());
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
        if (c === "+") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_OPERATOR_PLUS);
        }
        if (c === "-") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_OPERATOR_MINUS);
        }
        if (c === "*") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_OPERATOR_MULTIPLY);
        }
        if (c === "/") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_OPERATOR_DIVIDE);
        }
        if (c === "(") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_PARENTHESIS_OPEN);
        }
        if (c === ")") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_PARENTHESIS_CLOSE);
        }
        if (c === "=") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_OPERATOR_EQUAL);
        }
        if (c === ",") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_COMMA);
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

        if (this.reservedWords[identifier]) {
            return this.createToken(this.reservedWords[identifier]);
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

class Parser {
    index: number = 0;
    tokens: Array<Token>;

    constructor(tokens: Array<Token>) {
        this.tokens = tokens;
    }

    isEOF(): boolean {
        return this.index >= this.tokens.length || this.frontType() === TokenType.T_EOF;
    }

    parse() {
        while (!this.isEOF()) {
            this.parseStatement();
        }
    }
    
    parseIdentifier() {
        this.expect(TokenType.T_IDENTIFIER);
        this.skip(TokenType.T_WHITESPACE);
    }

    parseEcho() {
        this.expect(TokenType.T_ECHO);
        this.skip(TokenType.T_WHITESPACE);
    }

    parseStatement() {
        const ft = this.frontType();
        if (ft === TokenType.T_WHITESPACE) {
            this.goNextToken();
        } else if (ft === TokenType.T_SEMICOLON) {
            this.goNextToken();
        } else if (ft === TokenType.T_ECHO) {
            this.parseEcho();
        } else if (ft === TokenType.T_IDENTIFIER) {
            this.parseIdentifier();
        } else {
            throw new Error(`Unexpected token ${TokenType[ft]}`);
        }
    }

    frontType(): TokenType {
        return this.tokens[this.index].type;
    }
    
    front(): Token {
        return this.tokens[this.index];
    }

    skip(looking_for: TokenType): boolean {
        if (this.frontType() === looking_for) {
            this.goNextToken();
            return true;
        }
        return false;
    }

    expect(looking_for: TokenType): Token {
        let ft: TokenType = this.frontType();
        if (ft !== looking_for) {
            throw new Error(`Expected ${TokenType[looking_for]} but got ${TokenType[ft]}`);
        }
        const f: Token = this.front();
        this.goNextToken();
        return f;
    }

    goNextToken(): void {
        this.index++;
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
    const source_code = "age = 50;echo age;";
    input.setData(source_code);
    console.log(input);

    // =============== Lexer =================
    const lexer: Lexer = new Lexer(input);
    lexer.tokenize();
    console.log(lexer);
    // debug(lexer);
    // debug(lexer.tokens);

    // =============== Parser =================
    const parser: Parser = new Parser(lexer.tokens);
    parser.parse();
    console.log(parser);


    // =============== AST =================

    // =============== Interpreter =================

    // =============== Compiler =================

    // =============== Code Generator =================

    // =============== Code Optimizer =================

    // =============== Code Compiler =================

    // =============== Code Runner =================
}

main();
