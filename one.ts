/*
 * 
 * ONE - A compiler for the ONE programming language
 * Copyright (C) 2022
 * Author:	Max Base
 * 
 */

import * as fs from "fs";
import * as path from "path";

// --- General Helper function ---
function assert(predicate: boolean): asserts predicate is true {
    if (!predicate) throw new Error("Assertion failure");
    return;
}

interface binding_power { left_power: number; right_power: number; }

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

    T_OPEN_BRACE = 8,
    T_CLOSE_BRACE = 9,

    T_OPERATOR_PLUS = 10,
    T_OPERATOR_MINUS = 11,
    T_OPERATOR_MULTIPLY = 12,
    T_OPERATOR_DIVIDE = 13,
    T_OPERATOR_EQUAL = 14,
    T_OPERATOR_DOT = 15,
    T_OPERATOR_COLON = 16,
    T_OPERATOR_QUESTION = 17,
    T_OPERATOR_BANG = 18,
    T_OPERATOR_POWER = 19,


    // >
    // <
    // >=
    // <=
    // ==
    // !=
    // &&
    // ||
    // !
    T_OPERATOR_GREATER = 16,
    T_OPERATOR_LESS = 17,
    T_OPERATOR_GREATER_EQUAL = 18,
    T_OPERATOR_LESS_EQUAL = 19,
    T_OPERATOR_EQUAL_EQUAL = 20,
    T_OPERATOR_NOT_EQUAL = 21,
    T_OPERATOR_AND = 22,
    T_OPERATOR_OR = 23,
    T_OPERATOR_NOT = 24,

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
            if (this.getChar() === "*") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_POWER);
            }
            return this.createToken(TokenType.T_OPERATOR_MULTIPLY);
        }
        if (c === "/") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_OPERATOR_DIVIDE);
        }
        if (c === ".") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_OPERATOR_DOT);
        }
        if (c === ":") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_OPERATOR_COLON);
        }
        if (c === "?") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_OPERATOR_QUESTION);
        }
        if (c === "(") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_PARENTHESIS_OPEN);
        }
        if (c === ")") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_PARENTHESIS_CLOSE);
        }
        if (c === "{") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_OPEN_BRACE);
        }
        if (c === "}") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_CLOSE_BRACE);
        }
        // T_OPERATOR_GREATER = 16,
        // T_OPERATOR_LESS = 17,
        // T_OPERATOR_GREATER_EQUAL = 18,
        // T_OPERATOR_LESS_EQUAL = 19,
        // T_OPERATOR_EQUAL_EQUAL = 20,
        // T_OPERATOR_NOT_EQUAL = 21,
        // T_OPERATOR_AND = 22,
        // T_OPERATOR_OR = 23,
        // T_OPERATOR_NOT = 24,
        if (c === ">") {
            this.nextIndex(1);
            if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_GREATER_EQUAL);
            }
            return this.createToken(TokenType.T_OPERATOR_GREATER);
        }
        if (c === "<") {
            this.nextIndex(1);
            if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_LESS_EQUAL);
            }
            return this.createToken(TokenType.T_OPERATOR_LESS);
        }
        if (c === "=") {
            this.nextIndex(1);
            if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_EQUAL_EQUAL);
            }
            return this.createToken(TokenType.T_OPERATOR_EQUAL);
        }
        if (c === "!") {
            this.nextIndex(1);
            if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_NOT_EQUAL);
            }
            return this.createToken(TokenType.T_OPERATOR_NOT);
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

class Ast {
    kind: string = "";
}

class AstStatement implements Ast {
    kind: string = "Statement";
}

class AstEcho implements Ast {
    kind: string = "Echo";
}

class AstTernaryExpression implements Ast {
    kind: string = "TernaryExpression";
    condition: Ast;
    true_value: Ast;
    false_value: Ast;

    constructor(condition: Ast, true_value: Ast, false_value: Ast) {
        this.condition = condition;
        this.true_value = true_value;
        this.false_value = false_value;
    }
}

class AstPostfixExpression implements Ast {
    kind: string = "PostfixExpression";
    operator: Token;
    operand: Ast;

    constructor(operator: Token, operand: Ast) {
        this.operator = operator;
        this.operand = operand;
    }
}

class AstPrefixExpression implements Ast {
    kind: string = "PrefixExpression";
    operator: Token;
    right: Ast;

    constructor(operator: Token, right: Ast) {
        this.operator = operator;
        this.right = right;
    }
}

class AstExpression implements Ast {
    kind: string = "Expression";
    expression: Ast;

    constructor(expr: Ast) {
        this.expression = expr;
    }
}

class AstAssignmentExpression implements Ast {
    kind: string = "AssignmentExpression";
    operator: string;
    left: Ast;
    right: Ast;

    constructor(operator: string, left: Ast, right: Ast) {
        this.operator = operator;
        this.left = left;
        this.right = right;
    }
}

class AstIdentifier implements Ast {
    kind: string = "Identifier";
    name: string;

    constructor(name: string) {
        this.name = name;
    }
}

class AstMemberExpression implements Ast {
    kind: string = "MemberExpression";
    object: Ast;
    property: Ast;

    constructor(object: Ast, property: Ast) {
        this.object = object;
        this.property = property;
    }
}

class AstConditionalExpression implements Ast {
    kind: string = "ConditionalExpression";
    test: Ast;
    consequent: Ast;
    alternate: Ast;

    constructor(test: Ast, consequent: Ast, alternate: Ast) {
        this.test = test;
        this.consequent = consequent;
        this.alternate = alternate;
    }
}

class AstUnaryExpression implements Ast {
    kind: string = "UnaryExpression";
    operator: string;
    argument: Ast;

    constructor(operator: string, argument: Ast) {
        this.operator = operator;
        this.argument = argument;
    }
}

class AstIfStatement implements Ast {
    kind: string = "IfStatement";
    test: Ast;
    consequent: Ast;
    alternate: Ast | null;

    constructor(test: Ast, consequent: Ast, alternate: Ast | null) {
        this.test = test;
        this.consequent = consequent;
        this.alternate = alternate;
    }
}

class AstLogicalExpression implements Ast {
    kind: string = "LogicalExpression";
    operator: string;
    left: Ast;
    right: Ast;

    constructor(operator: string, left: Ast, right: Ast) {
        this.operator = operator;
        this.left = left;
        this.right = right;
    }
}

class AstBinaryExpression implements Ast {
    kind: string = "BinaryExpression";
    operator: Token;
    left: Ast;
    right: Ast;

    constructor(operator: Token, left: Ast, right: Ast) {
        this.operator = operator;
        this.left = left;
        this.right = right;
    }
}

class AstCallExpression implements Ast {
    kind: string = "CallExpression";
    callee: Ast;
    arguments: Array<Ast>;

    constructor(callee: Ast, args: Array<Ast>) {
        this.callee = callee;
        this.arguments = args;
    }
}

class AstLiteralExpression implements Ast {
    kind: string = "LiteralExpression";
    type: string;
    value: any;

    constructor(type: string, value: any) {
        this.type = type;
        this.value = value;
    }
}

class AstEmptyStatement implements Ast {
    kind: string = "EmptyStatement";
}

class AstBlock implements Ast {
    kind: string = "Block";
    statements: Array<Ast>;

    constructor(statements: Array<Ast>) {
        this.statements = statements;
    }
}

class AstProgram implements Ast {
    kind: string = "Program";
    body: AstStatement[];
    errors: string[] = [];
    location: LocationInfo;

    constructor(body: AstStatement[], location: LocationInfo) {
        this.body = body;
        this.location = location;
    }
}

class Parser {
    index: number = 0;
    location: LocationInfo;
    tokens: Array<Token>;

    constructor(location: LocationInfo, tokens: Array<Token>) {
        this.location = location;
        this.tokens = tokens;
    }

    isEOF(): boolean {
        return this.index >= this.tokens.length || this.frontType() === TokenType.T_EOF;
    }

    parse() {
        let statements: AstStatement[] = [];
        while (!this.isEOF()) {
            const ast: Ast | null = this.parseStatement();
            if (ast !== null) statements.push(ast);
        }
        return new AstProgram(statements, this.location);
    }
    
    parseIdentifier(): Ast {
        let ident: Token = this.expect(TokenType.T_IDENTIFIER);
        this.skip(TokenType.T_WHITESPACE);

        if (this.skip(TokenType.T_OPERATOR_EQUAL)) {
            this.skip(TokenType.T_WHITESPACE);

            let expr: any = this.parseExpression();
            console.log(`define ${ident.value} = ${expr}`);

            return new AstAssignmentExpression(
                "=",
                new AstIdentifier(ident.value),
                expr
            );
        } else if (this.skip(TokenType.T_OPERATOR_DOT)) {
            this.skip(TokenType.T_WHITESPACE);
            let expr: any = this.parseExpression();
            return new AstMemberExpression(
                new AstIdentifier(ident.value),
                expr
            );
        } else {
            return new AstIdentifier(ident.value);
        }
    }

    parseEcho(): Ast {
        this.expect(TokenType.T_ECHO);
        this.skip(TokenType.T_WHITESPACE);

        let expr: any = this.parseExpression();

        return new AstCallExpression(
            new AstIdentifier("echo"),
            [ expr ]
        );
    }

    parseExpressionLiteral(): Ast {
        const ft = this.frontType();
        if (ft === TokenType.T_NUMBER) {
            const t: Token = this.expect(TokenType.T_NUMBER);
            return new AstLiteralExpression("number", t.value);
        } else {
            throw new Error(`Unexpected token ${ft}`);
        }
    }

    parseBlock(): Ast {
        if (this.skip(TokenType.T_SEMICOLON)) {
            return new AstEmptyStatement();
        }

        this.expect(TokenType.T_OPEN_BRACE);
        this.skip(TokenType.T_WHITESPACE);
        let statements: AstStatement[] = [];
        while (!this.isEOF() && !this.skip(TokenType.T_CLOSE_BRACE)) {
            const ast: Ast | null = this.parseStatement();
            if (ast !== null) statements.push(ast);
        }
        return new AstBlock(statements);
    }

    parseIf(): Ast {
        this.expect(TokenType.T_IF);
        this.skip(TokenType.T_WHITESPACE);

        let test: Ast = this.parseExpression();
        this.skip(TokenType.T_WHITESPACE);

        let consequent: Ast = this.parseBlock();
        this.skip(TokenType.T_WHITESPACE);

        let alternate: Ast | null = null;
        if (this.skip(TokenType.T_ELSE)) {
            this.skip(TokenType.T_WHITESPACE);

            if (this.has(TokenType.T_OPEN_BRACE) || this.has(TokenType.T_SEMICOLON)) {
                alternate = this.parseBlock();
            } else if(this.has(TokenType.T_IF)) {
                alternate = this.parseStatement();
            } else {
                throw new Error(`Unexpected token ${TokenType[this.frontType()]} in else statement`);
            }
        }
        return new AstIfStatement(test, consequent, alternate);
    }

    parseSubExpression(): Ast {
        this.skip(TokenType.T_PARENTHESIS_OPEN);
        this.skip(TokenType.T_WHITESPACE);
        let expr: Ast = this.parseExpression();
        this.skip(TokenType.T_WHITESPACE);
        this.skip(TokenType.T_PARENTHESIS_CLOSE);

        return expr;
    }

    expectOneOf(tokens: Array<TokenType>): Token | null {
        let res: Token | null = null;

        for (let i = 0; i < tokens.length; i++) {
            if (this.frontType() === tokens[i]) {
                res = this.front();
                this.goNextToken();
                break;
            }
        }

        if (res === null) {
            throw new Error(`Unexpected token ${TokenType[this.frontType()]}`);
            return null;
        }
        return res;
    }

    parsePrefixExpression(min_bp: number): Ast {
        let operator: Token | null = this.expectOneOf([
            TokenType.T_OPERATOR_PLUS,
            TokenType.T_OPERATOR_MINUS,
        ]);

        if (operator === null) {
            throw new Error(`Unexpected token ${TokenType[this.frontType()]}`);
        }

        const expr: Ast = this.parseExpression(min_bp);
        return new AstPrefixExpression(operator, expr);
    }

    // Look up the right binding power of a given prefix operator
    prefix_bp_lookup(whichOperator: TokenType): number {
        switch(whichOperator) {
            case TokenType.T_OPERATOR_PLUS: return 300;
            case TokenType.T_OPERATOR_MINUS: return 300;
            default: return 0;
        }
    }
    
    parsePostfixExpression(lhs: Ast): Ast {
        let operator: Token | null = this.expectOneOf([
            TokenType.T_OPERATOR_PLUS,
            TokenType.T_OPERATOR_MINUS,
        ]);

        if (operator === null) {
            throw new Error(`Unexpected token ${TokenType[this.frontType()]}`);
        }

        return new AstPostfixExpression(operator, lhs);
    }
    
    parseTernaryExpression(clause: Ast): Ast {
        this.skip(TokenType.T_WHITESPACE);

        this.expect(TokenType.T_OPERATOR_QUESTION);
        this.skip(TokenType.T_WHITESPACE);

        let consequent: Ast = this.parseExpression(0);
        this.skip(TokenType.T_WHITESPACE);

        this.expect(TokenType.T_OPERATOR_COLON);
        this.skip(TokenType.T_WHITESPACE);

        let alternate: Ast = this.parseExpression(0);
        this.skip(TokenType.T_WHITESPACE);

        return new AstTernaryExpression(clause, consequent, alternate);
    }
    
    parseBinaryExpression(_lhs: Ast, min_bp: number): Ast {
        let lhs: Ast = _lhs;
        let operator: Token | null = this.expectOneOf([
            TokenType.T_OPERATOR_PLUS,
            TokenType.T_OPERATOR_MINUS,
        ]);

        // console.log("ft is:", this.front());
        // let operator: Token | null = this.front();

        if (operator === null) {
            throw new Error(`Unexpected token ${TokenType[this.frontType()]}`);
        }

        let rhs: Ast = this.parseExpression(min_bp);

        return new AstBinaryExpression(operator, lhs, rhs);
    }

    LeftAssociative(priority: number): binding_power {
        return { left_power: (priority - 1), right_power: priority };
    }

    RightAssociative(priority: number): binding_power {
        return { left_power: (priority + 1), right_power: priority };
    }

    bp_lookup(whichOperator: TokenType): binding_power {
        const no_binding_power: binding_power = {left_power: 0, right_power: 0};

        switch (whichOperator) {
            case TokenType.T_OPERATOR_PLUS: return this.LeftAssociative(100);
            case TokenType.T_OPERATOR_MINUS: return this.LeftAssociative(100);
            case TokenType.T_OPERATOR_MULTIPLY: return this.LeftAssociative(200);
            case TokenType.T_OPERATOR_DIVIDE: return this.LeftAssociative(200);
            // case TokenType.T_POW: return this.LeftAssociative(99);
            case TokenType.T_OPERATOR_POWER: return this.RightAssociative(99);
            case TokenType.T_OPERATOR_QUESTION: return this.RightAssociative(1000);

            case TokenType.T_OPERATOR_GREATER: return this.LeftAssociative(50);
            case TokenType.T_OPERATOR_GREATER_EQUAL: return this.LeftAssociative(50);
            case TokenType.T_OPERATOR_LESS: return this.LeftAssociative(50);
            case TokenType.T_OPERATOR_LESS_EQUAL: return this.LeftAssociative(50);
            case TokenType.T_OPERATOR_EQUAL_EQUAL: return this.LeftAssociative(50);
            case TokenType.T_OPERATOR_NOT_EQUAL: return this.LeftAssociative(50);

            // --- Postfix --- (Always Right Associative)
            case TokenType.T_OPERATOR_BANG: return this.RightAssociative(400);
            //Note: Postfix operators are always RightAssociative

            default: return no_binding_power;
        }
    }

    parseExpression(binding_power_to_my_right: number = 0): Ast {
        let result: Ast | null = null;

        const ft = this.frontType();
        console.log("parseExpression: ft is:", TokenType[ft]);
        if (ft === TokenType.T_NUMBER) {
            result = this.parseExpressionLiteral();   
        } else if (ft === TokenType.T_PARENTHESIS_OPEN) {
            result = this.parseSubExpression();
        // } else if (ft === TokenType.T_IDENTIFIER) {
        //     return this.parseIdentifier();
        } else if (this.has(TokenType.T_OPERATOR_PLUS) || this.has(TokenType.T_OPERATOR_MINUS)) {
            result = this.parsePrefixExpression(this.prefix_bp_lookup(ft));
        }
        // else {
        //     throw new Error(`parseExpression: Unexpected token ${TokenType[ft]}`);
        // }

        console.log("Result is: ", result);

        assert(result != null); // We should always have either a LHS or Prefix Operator at this point.

        console.log(binding_power_to_my_right);
        console.log(this.bp_lookup(this.frontType()).left_power);

        while(binding_power_to_my_right < this.bp_lookup(this.frontType()).left_power) {
            // Is it a postfix expression?
            if (this.has(TokenType.T_OPERATOR_BANG)) {
                result = this.parsePostfixExpression(result);
            } else if (this.has(TokenType.T_OPERATOR_QUESTION)) {
                result = this.parseTernaryExpression(result);
            } else {
                // It must be a binary expression
                result = this.parseBinaryExpression(result, this.bp_lookup(this.frontType()).right_power);
            }
        }

        assert(result != null); // This factory should always return an expression tree fragment
        return result;
    }

    parseStatement(): Ast | null {
        const ft = this.frontType();
        if (ft === TokenType.T_WHITESPACE || ft === TokenType.T_SEMICOLON) {
            this.goNextToken();
            return null;
        } else if (ft === TokenType.T_IF) {
            return this.parseIf();
        } else if (ft === TokenType.T_ECHO) {
            return this.parseEcho();
        } else if (ft === TokenType.T_IDENTIFIER) {
            return this.parseExpression();
        } else {
            throw new Error(`Unexpected token ${TokenType[ft]}`);
        }
    }

    frontType(): TokenType {
        // console.log(this.index, this.tokens[this.index]);
        return this.tokens[this.index].type;
    }
    
    front(): Token {
        return this.tokens[this.index];
    }

    has(looking_for: TokenType): boolean {
        if (this.frontType() === looking_for) {
            return true;
        }
        return false;
    }

    skip(looking_for: TokenType): boolean {
        if (!this.isEOF() && this.frontType() === looking_for) {
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
    // const source_code = "age = 50;echo age;";
    // const source_code = "age = 50;";
    // const source_code = "echo age;a.b.c";
    // const source_code = "echo age;a.b.c; age = 50;if(5>2){echo 1;}";//  else {echo 2;}";
    // const source_code = "if(5){echo 1;} else {echo 2;} if(5) ;";
    const source_code = "echo 110*10;";
    input.setData(source_code);
    console.log(input);

    // =============== Lexer =================
    const lexer: Lexer = new Lexer(input);
    lexer.tokenize();
    console.log(lexer);
    // debug(lexer);
    // debug(lexer.tokens);

    // =============== Parser =================
    const parser: Parser = new Parser(lexer.location, lexer.tokens);
    const ast: AstProgram = parser.parse();
    // console.log(parser);
    // console.log(ast);
    debug(ast);

    // =============== AST =================

    // =============== Interpreter =================

    // =============== Compiler =================

    // =============== Code Generator =================

    // =============== Code Optimizer =================

    // =============== Code Compiler =================

    // =============== Code Runner =================
}

main();
