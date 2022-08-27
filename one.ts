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
    T_OPERATOR_ASSIGN = 14,
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
    T_OPERATOR_GREATER_THAN = 16,
    T_OPERATOR_LESS_THAN = 17,
    T_OPERATOR_GREATER_THAN_EQUAL = 18,
    T_OPERATOR_LESS_THAN_EQUAL = 19,
    T_OPERATOR_ASSIGN_EQUAL = 20,
    T_OPERATOR_NOT_EQUAL = 21,
    T_OPERATOR_AND = 22,
    T_OPERATOR_OR = 23,
    T_OPERATOR_NOT = 24,

    T_STRING_SINGLE_QUOTE = 25,
    T_STRING_DOUBLE_QUOTE = 26,

    T_TRUE = 27,
    T_FALSE = 28,
    T_NULL = 29,
    T_UNDEFINED = 30,

    T_OPERATOR_BIT_AND = 31,
    T_OPERATOR_BIT_OR = 32,
    T_OPERATOR_BIT_XOR,

    T_OPERATOR_MODULO = 33,

    T_OPERATOR_ASSIGN_ADD,
    T_OPERATOR_ASSIGN_SUBTRACT,
    T_OPERATOR_ASSIGN_MULTIPLY,
    T_OPERATOR_ASSIGN_DIVIDE,
    T_OPERATOR_ASSIGN_MODULO,
    T_OPERATOR_ASSIGN_BIT_AND,
    T_OPERATOR_ASSIGN_BIT_OR,
    T_OPERATOR_ASSIGN_BIT_XOR,
    T_OPERATOR_ASSIGN_BIT_LEFT_SHIFT,
    T_OPERATOR_ASSIGN_BIT_RIGHT_SHIFT,
    T_OPERATOR_BIT_LEFT_SHIFT,
    T_OPERATOR_BIT_RIGHT_SHIFT,

    T_OPERATOR_INCREASEMENT = 34,
    T_OPERATOR_DECREASEMENT = 35,

    T_INLINE_COMMENT,
    T_BLOCK_COMMENT,

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

        "true": TokenType.T_TRUE,
        "false": TokenType.T_FALSE,
        "null": TokenType.T_NULL,
        "undefined": TokenType.T_UNDEFINED,

        "and": TokenType.T_OPERATOR_AND,
        "or": TokenType.T_OPERATOR_OR,
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

        this.tokens.push(new Token(TokenType.T_EOF, this.location));

        this.location.start_location = new Location(0, 0, 1);
    }

    nextIndex(n: number) { // n maybe negative
        this.location.end_location.offset += n;
        this.location.end_location.index += n;
    }

    getLocation() : LocationInfo {
        return new LocationInfo(this.location.start_location.deep(), this.location.end_location.deep());
    }

    createToken(kind: TokenType, value?: any) {
        return new Token(kind, this.getLocation(), value);
    }

    readBlockComment(): string {
        let comment = "";
        while (!this.isEOF()) {
            const c = this.getChar();
            if (c === "\n") {
                this.nextIndex(1);
                this.location.end_location.line++;
                this.location.end_location.offset = 0;
                break;
            } else if (c === "*") {
                this.nextIndex(1);
                if (this.getChar() === "/") {
                    this.nextIndex(1);
                    break;
                } else {
                    this.nextIndex(-1);
                }
            }
            comment += c;
            this.nextIndex(1);
        }
        return comment;
    }

    readInlineComment(): string {
        let comment = "";

        while (!this.isEOF()) {
            const ch = this.getChar();
            if (ch === "\n") {
                break;
            }
            comment += ch;
            this.nextIndex(1);
        }

        return comment;
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
            if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_ASSIGN_ADD);
            } else if (this.getChar() === "+") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_INCREASEMENT);
            }
            return this.createToken(TokenType.T_OPERATOR_PLUS);
        }
        if (c === "-") {
            this.nextIndex(1);
            if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_ASSIGN_SUBTRACT);
            } else if (this.getChar() === "-") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_DECREASEMENT);
            }
            return this.createToken(TokenType.T_OPERATOR_MINUS);
        }
        if (c === "*") {
            this.nextIndex(1);
            if (this.getChar() === "*") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_POWER);
            } else if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_ASSIGN_MULTIPLY);
            }
            return this.createToken(TokenType.T_OPERATOR_MULTIPLY);
        }
        if (c === "/") {
            this.nextIndex(1);
            if (this.getChar() === "/") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_INLINE_COMMENT, this.readInlineComment());
            } else if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_ASSIGN_DIVIDE);
            } else if (this.getChar() === "*") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_BLOCK_COMMENT, this.readBlockComment());
            }
            return this.createToken(TokenType.T_OPERATOR_DIVIDE);
        }
        if (c === "%") {
            this.nextIndex(1);
            if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_ASSIGN_MODULO);
            }
            return this.createToken(TokenType.T_OPERATOR_MODULO);
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
        // T_STRING_SINGLE_QUOTE
        if (c === "'") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_STRING_SINGLE_QUOTE, this.readStringSingle());
        }
        // T_STRING_DOUBLE_QUOTE
        if (c === "\"") {
            this.nextIndex(1);
            return this.createToken(TokenType.T_STRING_DOUBLE_QUOTE, this.readStringDouble());
        }
        // T_OPERATOR_GREATER_THAN = 16,
        // T_OPERATOR_LESS_THAN = 17,
        // T_OPERATOR_GREATER_THAN_EQUAL = 18,
        // T_OPERATOR_LESS_THAN_EQUAL = 19,
        // T_OPERATOR_ASSIGN_EQUAL = 20,
        // T_OPERATOR_NOT_EQUAL = 21,
        // T_OPERATOR_AND = 22,
        // T_OPERATOR_OR = 23,
        // T_OPERATOR_NOT = 24,
        if (c === ">") {
            this.nextIndex(1);
            if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_GREATER_THAN_EQUAL);
            } else if (this.getChar() === "<") {
                this.nextIndex(1);
                if (this.getChar() === "=") {
                    this.nextIndex(1);
                    return this.createToken(TokenType.T_OPERATOR_ASSIGN_BIT_RIGHT_SHIFT);
                } else {
                    return this.createToken(TokenType.T_OPERATOR_BIT_RIGHT_SHIFT);
                }
            }
            return this.createToken(TokenType.T_OPERATOR_GREATER_THAN);
        }
        if (c === "<") {
            this.nextIndex(1);
            if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_LESS_THAN_EQUAL);
            } else if (this.getChar() === "<") {
                this.nextIndex(1);
                if (this.getChar() === "=") {
                    this.nextIndex(1);
                    return this.createToken(TokenType.T_OPERATOR_ASSIGN_BIT_LEFT_SHIFT);
                } else {
                    return this.createToken(TokenType.T_OPERATOR_BIT_LEFT_SHIFT);
                }
            } else if (this.getChar() === ">") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_NOT_EQUAL);
            }
            return this.createToken(TokenType.T_OPERATOR_LESS_THAN);
        }
        if (c === "^") {
            this.nextIndex(1);
            if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_ASSIGN_BIT_XOR);
            }
            return this.createToken(TokenType.T_OPERATOR_BIT_XOR);
        }
        if (c === "=") {
            this.nextIndex(1);
            if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_ASSIGN_EQUAL);
            }
            return this.createToken(TokenType.T_OPERATOR_ASSIGN);
        }
        if (c === "|") {
            this.nextIndex(1);
            if (this.getChar() === "|") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_OR);
            } else if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_ASSIGN_BIT_OR);
            }
            return this.createToken(TokenType.T_OPERATOR_BIT_OR);
        }
        if (c === "&") {
            this.nextIndex(1);
            if (this.getChar() === "&") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_AND);
            } else if (this.getChar() === "=") {
                this.nextIndex(1);
                return this.createToken(TokenType.T_OPERATOR_ASSIGN_BIT_AND);
            }
            return this.createToken(TokenType.T_OPERATOR_BIT_AND);
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

    readStringSingle(): string {
        let s = "";
        let c = this.getChar();
        while (c !== "'") {
            s += c;
            this.nextIndex(1);
            c = this.getChar();
        }

        this.nextIndex(1); // skip last quote
        return s;
    }

    readStringDouble(): string {
        let s = "";
        let c = this.getChar();
        while (c !== "\"") {
            s += c;
            this.nextIndex(1);
            c = this.getChar();
        }

        this.nextIndex(1); // skip last quote
        return s;
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

        console.log(identifier, this.reservedWords);

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

class AstExpressionStatement extends Ast {
    kind: string = "ExpressionStatement";
    expression: Ast;

    constructor(expression: Ast) {
        super();
        this.expression = expression;
    }
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
    kind: string = "BlockStatement";
    statements: Array<Ast>;

    constructor(statements: Array<Ast>) {
        this.statements = statements;
    }
}

class AstInlineComment implements Ast {
    kind: string = "InlineComment";
    comment: string;
    location: Location;

    constructor(comment: string, location: Location) {
        this.comment = comment;
        this.location = location;
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

class Interpreter {
    ast: any;
    code: string = "";

    constructor(ast: any) {
        this.ast = ast;
    }

    interpret(): string {
        let code = "";

        assert(this.ast.kind === "Program");

        if (this.ast.errors.length > 0) {
            throw new Error("Parse error: " + this.ast.errors.join(", "));
            return "";
        }

        return this.interpretStatements(this.ast.body);
    }

    interpretStatements(statements: AstStatement[]): string {
        let code = "";
        for (let statement of statements) {
            code += this.interpretStatement(statement);
        }
        return code;
    }

    interpretBinaryExpression(expression: AstBinaryExpression): string {
        let code = "";

        switch (expression.operator.type) {
            case TokenType.T_OPERATOR_PLUS:
                code += this.interpretExpression(expression.left) + " + " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_MINUS:
                code += this.interpretExpression(expression.left) + " - " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_MULTIPLY:
                code += this.interpretExpression(expression.left) + " * " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_DIVIDE:
                code += this.interpretExpression(expression.left) + " / " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_MODULO:
                code += this.interpretExpression(expression.left) + " % " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_ASSIGN_EQUAL:
                code += this.interpretExpression(expression.left) + " == " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_NOT_EQUAL:
                code += this.interpretExpression(expression.left) + " != " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_LESS_THAN:
                code += this.interpretExpression(expression.left) + " < " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_LESS_THAN_EQUAL:
                code += this.interpretExpression(expression.left) + " <= " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_GREATER_THAN:
                code += this.interpretExpression(expression.left) + " > " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_GREATER_THAN_EQUAL:
                code += this.interpretExpression(expression.left) + " >= " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_AND:
                code += this.interpretExpression(expression.left) + " && " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_OR:
                code += this.interpretExpression(expression.left) + " || " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_ASSIGN:
                code += this.interpretExpression(expression.left) + " = " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_ASSIGN_ADD:
                code += this.interpretExpression(expression.left) + " += " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_ASSIGN_SUBTRACT:
                code += this.interpretExpression(expression.left) + " -= " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_ASSIGN_MULTIPLY:
                code += this.interpretExpression(expression.left) + " *= " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_ASSIGN_DIVIDE:
                code += this.interpretExpression(expression.left) + " /= " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_ASSIGN_MODULO:
                code += this.interpretExpression(expression.left) + " %= " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_ASSIGN_BIT_AND:
                code += this.interpretExpression(expression.left) + " &= " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_ASSIGN_BIT_OR:
                code += this.interpretExpression(expression.left) + " |= " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_ASSIGN_BIT_XOR:
                code += this.interpretExpression(expression.left) + " ^= " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_ASSIGN_BIT_LEFT_SHIFT:
                code += this.interpretExpression(expression.left) + " <<= " + this.interpretExpression(expression.right);
                break;
            case TokenType.T_OPERATOR_ASSIGN_BIT_RIGHT_SHIFT:
                code += this.interpretExpression(expression.left) + " >>= " + this.interpretExpression(expression.right);
                break;
        }
        

        return code;
    }

    interpretExpression(expression: Ast): string {
        // console.log(expression);

        switch (expression.kind) {
            case "Identifier":
                return (expression as AstIdentifier).name;
            case "LiteralExpression":
                return (expression as AstLiteralExpression).value;
            case "BinaryExpression":
                return this.interpretBinaryExpression(expression as AstBinaryExpression);
            default:
                throw new Error("Unsupported expression: " + expression.kind);
        }
        return "";
    }

    interpretCallExpression(statement: AstCallExpression): string {
        let code = "";

        code += "call " + this.interpretExpression(statement.callee);
        code += "(";
        code += statement.arguments.map(arg => this.interpretExpression(arg)).join(", ");
        code += ");\n";

        return code;
    }

    interpretStatement(statement: AstStatement): string {
        console.log("Stmt:", statement.kind, statement);

        switch (statement.kind) {
            case "ExpressionStatement":
                // return this.interpretExpressionStatement(statement);
                break;
            case "CallExpression":
                return this.interpretCallExpression(statement as AstCallExpression);
                break;
            case "BlockStatement":
                // return this.interpretBlockStatement(statement);
                break;
            case "IfStatement":
                return this.interpretIfStatement(statement as AstIfStatement);
                break;
            case "EmptyStatement":
                // return this.interpretEmptyStatement(statement);
                break;
            default:
                throw new Error("Unknown statement kind: " + statement.kind);
        }
        return "";
    }

    interpretIfStatement(statement: AstIfStatement): string {
        let code = "";

        const test: string = this.interpretExpression(statement.test);

        code += "if (" + test + ") ";
        code += this.interpretBlock(statement.consequent as AstBlock);

        if (statement.alternate) {
            code += " else ";
            if (statement.alternate.kind !== "IfStatement" && statement.alternate.kind !== "BlockStatement" && statement.alternate.kind !== "EmptyStatement") {
                throw new Error("Unsupported statement: " + statement.alternate.kind);
            }
            
            if (statement.alternate.kind === "BlockStatement") code += "{ ";
            code += this.interpretStatement(statement.alternate as AstBlock);
            if (statement.alternate.kind === "BlockStatement") code += "}";
        }

        return code;
    }

    interpretBlock(block: AstBlock): string {
        let code = "";

        code += "{";
        for (let statement of block.statements) {
            code += this.interpretStatement(statement);
        }
        code += "}";

        return code;
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
        this.skipWhitespace();

        if (this.skip(TokenType.T_OPERATOR_ASSIGN)) {
            this.skipWhitespace();

            let expr: any = this.parseExpression();

            return new AstAssignmentExpression(
                "=",
                new AstIdentifier(ident.value),
                expr
            );
        } else if (this.skip(TokenType.T_OPERATOR_DOT)) {
            this.skipWhitespace();
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
        let has_parent = false;

        this.expect(TokenType.T_ECHO);
        this.skipWhitespace();

        if (this.skip(TokenType.T_PARENTHESIS_OPEN)) {
            has_parent = true;
            this.skipWhitespace();
        }

        let exprs: Array<any> = this.parseExpressions();

        if (has_parent) {
            this.skipWhitespace();
            this.expect(TokenType.T_PARENTHESIS_CLOSE);
        }

        return new AstCallExpression(
            new AstIdentifier("echo"),
            exprs,
        );
    }

    parseExpressionLiteral(): Ast {
        const ft = this.frontType();
        if (ft === TokenType.T_NUMBER) {
            const t: Token = this.expect(TokenType.T_NUMBER);
            return new AstLiteralExpression("number", t.value);
        } else if (ft === TokenType.T_TRUE || ft === TokenType.T_FALSE) {
            const t: Token = this.expectOneOf([
                TokenType.T_TRUE,
                TokenType.T_FALSE
            ]);
            return new AstLiteralExpression("boolean", t.type === TokenType.T_TRUE ? "true" : "false");
        } else if (ft === TokenType.T_IDENTIFIER) {
            return this.parseIdentifier();
        } else if (ft === TokenType.T_STRING_DOUBLE_QUOTE) {
            const t: Token = this.expect(TokenType.T_STRING_DOUBLE_QUOTE);
            return new AstLiteralExpression("string_double", t.value);
        } else if (ft === TokenType.T_STRING_SINGLE_QUOTE) {
            const t: Token = this.expect(TokenType.T_STRING_SINGLE_QUOTE);
            return new AstLiteralExpression("string_single", t.value);
        } else {
            throw new Error(`Unexpected token ${TokenType[ft]}`);
        }
    }

    skipWhitespace() {
        while (this.frontType() === TokenType.T_WHITESPACE ||
              this.frontType() === TokenType.T_INLINE_COMMENT ||
              this.frontType() === TokenType.T_BLOCK_COMMENT) {
            this.goNextToken();
        }
    }

    parseBlock(): Ast {
        if (this.skip(TokenType.T_SEMICOLON)) {
            return new AstEmptyStatement();
        }

        this.expect(TokenType.T_OPEN_BRACE);
        this.skipWhitespace();
        let statements: AstStatement[] = [];
        while (!this.isEOF() && !this.skip(TokenType.T_CLOSE_BRACE)) {
            const ast: Ast | null = this.parseStatement();
            if (ast !== null) statements.push(ast);
        }
        return new AstBlock(statements);
    }

    parseIf(): Ast {
        this.expect(TokenType.T_IF);
        this.skipWhitespace();

        let test: Ast = this.parseExpression();
        this.skipWhitespace();

        let consequent: Ast = this.parseBlock();
        this.skipWhitespace();

        let alternate: Ast | null = null;
        if (this.skip(TokenType.T_ELSE)) {
            this.skipWhitespace();

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
        this.skipWhitespace();
        let expr: Ast = this.parseExpression();
        this.skipWhitespace();
        this.skip(TokenType.T_PARENTHESIS_CLOSE);

        return expr;
    }

    expectOneOf(tokens: Array<TokenType>): Token {
        let res: Token | null = null;

        for (let i = 0; i < tokens.length; i++) {
            if (this.frontType() === tokens[i]) {
                res = this.front();
                this.goNextToken();
                break;
            }
        }

        if (res === null) {
            throw new Error(`Unexpected token ${TokenType[this.frontType()]} instead of ${tokens.map(t => TokenType[t]).join(" or ")}`);
        }
        return res;
    }

    skipOneOf(tokens: Array<TokenType>): boolean {
        let count: number = 0;
        
        for (let i = 0; i < tokens.length; i++) {
            if (this.frontType() === tokens[i]) {
                count++;
                this.goNextToken();
                break;
            }
        }

        if (count === 0) return false;
        return true;
    }

    skipAsMuchAs(tokens: Array<TokenType>): boolean {
        let count: number = 0;

        for (let i = 0; i < tokens.length; i++) {
            if (this.frontType() === tokens[i]) {
                count++;
                this.goNextToken();
            }
        }

        if (count === 0) return false;
        return true;
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
        this.skipWhitespace();

        this.expect(TokenType.T_OPERATOR_QUESTION);
        this.skipWhitespace();

        let consequent: Ast = this.parseExpression(0);
        this.skipWhitespace();

        this.expect(TokenType.T_OPERATOR_COLON);
        this.skipWhitespace();

        let alternate: Ast = this.parseExpression(0);
        this.skipWhitespace();

        return new AstTernaryExpression(clause, consequent, alternate);
    }
    
    parseBinaryExpression(_lhs: Ast, min_bp: number): Ast {
        let lhs: Ast = _lhs;
        let operator: Token | null = this.expectOneOf([
            TokenType.T_OPERATOR_PLUS,
            TokenType.T_OPERATOR_MINUS,
            TokenType.T_OPERATOR_MULTIPLY,
            TokenType.T_OPERATOR_DIVIDE,

            TokenType.T_OPERATOR_AND,
            TokenType.T_OPERATOR_OR,
        ]);
        if (operator === null) {
            throw new Error(`Unexpected token ${TokenType[this.frontType()]}`);
        }
        this.goNextToken();

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
            case TokenType.T_OPERATOR_AND: return this.LeftAssociative(300);
            case TokenType.T_OPERATOR_OR: return this.LeftAssociative(400);

            case TokenType.T_OPERATOR_BIT_AND: return this.LeftAssociative(500);
            case TokenType.T_OPERATOR_BIT_OR: return this.LeftAssociative(600);

            case TokenType.T_OPERATOR_PLUS: return this.LeftAssociative(100);
            case TokenType.T_OPERATOR_MINUS: return this.LeftAssociative(100);
            case TokenType.T_OPERATOR_MULTIPLY: return this.LeftAssociative(200);
            case TokenType.T_OPERATOR_DIVIDE: return this.LeftAssociative(200);
            // case TokenType.T_POW: return this.LeftAssociative(99);
            case TokenType.T_OPERATOR_POWER: return this.RightAssociative(99);
            case TokenType.T_OPERATOR_QUESTION: return this.RightAssociative(1000);

            case TokenType.T_OPERATOR_GREATER_THAN: return this.LeftAssociative(50);
            case TokenType.T_OPERATOR_GREATER_THAN_EQUAL: return this.LeftAssociative(50);
            case TokenType.T_OPERATOR_LESS_THAN: return this.LeftAssociative(50);
            case TokenType.T_OPERATOR_LESS_THAN_EQUAL: return this.LeftAssociative(50);
            case TokenType.T_OPERATOR_ASSIGN_EQUAL: return this.LeftAssociative(50);
            case TokenType.T_OPERATOR_NOT_EQUAL: return this.LeftAssociative(50);

            // --- Postfix --- (Always Right Associative)
            case TokenType.T_OPERATOR_BANG: return this.RightAssociative(400);
            //Note: Postfix operators are always RightAssociative

            default: return no_binding_power;
        }
    }

    parseExpressions(): Array<Ast> {
        let expressions: Array<Ast> = [];

        while (!this.isEOF()) {
            expressions.push(this.parseExpression());
            this.skipWhitespace();

            if (this.skip(TokenType.T_COMMA)) {
                this.skipWhitespace();
            } else {
                break;
            }
        }

        return expressions;
    }

    parseExpression(binding_power_to_my_right: number = 0): Ast {
        let result: Ast | null = null;

        const ft = this.frontType();
        if (ft === TokenType.T_IDENTIFIER || ft === TokenType.T_NUMBER || ft === TokenType.T_STRING_DOUBLE_QUOTE || ft === TokenType.T_STRING_SINGLE_QUOTE || ft === TokenType.T_TRUE || ft === TokenType.T_FALSE || ft === TokenType.T_NULL || ft === TokenType.T_UNDEFINED) {
            result = this.parseExpressionLiteral();
        } else if (ft === TokenType.T_PARENTHESIS_OPEN) {
            result = this.parseSubExpression();
        } else if (this.has(TokenType.T_OPERATOR_PLUS) || this.has(TokenType.T_OPERATOR_MINUS)) {
            result = this.parsePrefixExpression(this.prefix_bp_lookup(ft));
        } else {
            throw new Error(`parseExpression: Unexpected token ${TokenType[ft]}`);
        }

        assert(result != null); // We should always have either a LHS or Prefix Operator at this point.

        this.skipWhitespace();

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

    is_value(ft: TokenType): boolean {
        return ft === TokenType.T_IDENTIFIER ||

               ft === TokenType.T_TRUE ||
               ft === TokenType.T_FALSE ||
               ft === TokenType.T_NULL ||
               ft === TokenType.T_UNDEFINED ||

               ft === TokenType.T_NUMBER ||
               ft === TokenType.T_STRING_DOUBLE_QUOTE ||
               ft === TokenType.T_STRING_SINGLE_QUOTE ||

               ft === TokenType.T_OPERATOR_BANG ||
               ft === TokenType.T_PARENTHESIS_OPEN ||

               ft === TokenType.T_OPERATOR_PLUS ||
               ft === TokenType.T_OPERATOR_MINUS;
    }

    parseStatement(): Ast | null {
        const ft = this.frontType();
        if (ft === TokenType.T_EOF || ft === TokenType.T_WHITESPACE || ft === TokenType.T_SEMICOLON || ft === TokenType.T_INLINE_COMMENT || ft === TokenType.T_BLOCK_COMMENT) {
            this.goNextToken();
            return null;
        } else if (ft === TokenType.T_IF) {
            return this.parseIf();
        } else if (ft === TokenType.T_ECHO) {
            return this.parseEcho();
        } else if (this.is_value(ft)) {
            return new AstExpressionStatement(this.parseExpression());
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
    // const source_code = "echo 110*10;";
    // const source_code = "echo 110*10+10;";
    // const source_code = "echo 10+110*10;";
    // const source_code = "10+110*10;";
    // const source_code = "'hey';";
    // const source_code = "   true   ;   ";
    // const source_code = "   true and true or (false);   ";
    const source_code = "// hi there\necho(10, 20, 30); if true {}else if false{} else if true and true {} else {echo 1}";
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
    // console.log(parser);

    // =============== AST =================
    const ast: AstProgram = parser.parse();
    // console.log(ast);
    debug(ast);

    // =============== Interpreter =================
    const interpreter = new Interpreter(ast);
    const code = interpreter.interpret();
    console.log(code);

    // =============== Compiler =================

    // =============== Code Generator =================

    // =============== Code Optimizer =================

    // =============== Code Compiler =================

    // =============== Code Runner =================
}

main();
