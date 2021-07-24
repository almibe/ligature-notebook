/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Statement, Entity, Attribute, identifierPattern } from "@ligature/ligature";
import type { Value } from '@ligature/ligature';
import { createToken, CstParser, Lexer } from 'chevrotain';

export const WHITE_SPACE_T = createToken({ name: "WhiteSpace", pattern: /\s+/, group: Lexer.SKIPPED });
export const ANGLE_START_T = createToken({name: "AngleStart", pattern: /</});
export const ATTRIBUTE_START_T = createToken({name: "AttributeStart", pattern: /@</});
export const ANGLE_END_T = createToken({name: "AngleEnd", pattern: />/});
export const IDENTIFIER_T = createToken({name: "Identifier", pattern: identifierPattern});
export const STRING_T = createToken({name: "String", pattern: /"(:?[^\\"\n\r]+|\\(:?[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/});
export const FLOAT_T = createToken({name: "Float", pattern: /[0-9]+\.[0-9]+/}); //TODO fix pattern to not allow leading zeros
export const INTEGER_T = createToken({name: "Integer", pattern: /[0-9]+/}); //TODO fix pattern to not allow leading zeros
export const BYTES_T = createToken({name: "Bytes", pattern: /0x(:?[0-9A-Fa-f]{2})+/});

let allTokens = [
    WHITE_SPACE_T,
    ANGLE_START_T,
    ATTRIBUTE_START_T,
    ANGLE_END_T,
    IDENTIFIER_T,
    STRING_T,
    BYTES_T,
    FLOAT_T,
    INTEGER_T
];

class LigParser extends CstParser {
    constructor() {
        super(allTokens);

        const $ = this;

        $.RULE("statements", () => {
            $.MANY(() => {
                $.SUBRULE($.statement);
            })
        });

        $.RULE("statement", () => {
            $.SUBRULE($.entity);
            $.SUBRULE($.attribute);
            $.SUBRULE($.value);
            $.SUBRULE2($.entity);
        });

        $.RULE("entity", () => {
            $.CONSUME(ANGLE_START_T);
            $.CONSUME(IDENTIFIER_T);
            $.CONSUME(ANGLE_END_T);
        });

        $.RULE("attribute", () => {
            $.CONSUME(ATTRIBUTE_START_T);
            $.CONSUME(IDENTIFIER_T);
            $.CONSUME(ANGLE_END_T);
        });

        $.RULE("value", () => {
            $.OR([
                { ALT: () => $.SUBRULE($.entity) },
                { ALT: () => $.CONSUME(STRING_T) },
                { ALT: () => $.CONSUME(FLOAT_T) },
                { ALT: () => $.CONSUME(INTEGER_T) },
                { ALT: () => $.CONSUME(BYTES_T) }
            ])
        });

        this.performSelfAnalysis();
    }

    //properties below just exist to make TS happy
    entity: any;
    attribute: any;
    value: any;
    statement: any;
    statements: any;
}

let ligLexer = new Lexer(allTokens);
let ligParser = new LigParser();

export function read(input: string): Array<Statement> {
    const lexResult = ligLexer.tokenize(input);
    ligParser.input = lexResult.tokens;
    let res = ligParser.statements().children;
    let statements = Array<Statement>();
    if (res.statement == undefined) {
        return statements;
    }
    res = res.statement;
    for (let s of res) {
        let statement = s.children;
        let entity = new Entity(statement.entity[0].children.Identifier[0].image);
        let attribute = new Attribute(statement.attribute[0].children.Identifier[0].image);
        let value = processValue(statement.value[0]);
        let context = new Entity(statement.entity[1].children.Identifier[0].image);
        statements.push(new Statement(entity, attribute, value, context));
    }
    return statements;
}

export function readEntity(input: string): Entity {
    const lexResult = ligLexer.tokenize(input);
    ligParser.input = lexResult.tokens;
    let res = ligParser.entity();
    if (res == undefined) {
        throw new Error("Could not read Entity from - " + input);
    } else {
        return new Entity(res.children.Identifier[0].image);
    }
}

export function readAttribute(input: string): Attribute {
    const lexResult = ligLexer.tokenize(input);
    ligParser.input = lexResult.tokens;
    let res = ligParser.attribute();
    if (res == undefined) {
        throw new Error("Could not read Attribute from - " + input);
    } else {
        return new Attribute(res.children.Identifier[0].image);
    }
}

export function readValue(input: string): Value {
    const lexResult = ligLexer.tokenize(input);
    ligParser.input = lexResult.tokens;
    let res = ligParser.value();
    return processValue(res);
}

function processValue(value: any): Value {
    if (value == undefined) {
        throw new Error("Could not read Value from - " + value);
    } else {
        if (value.children.entity != undefined) {
            return new Entity(value.children.entity[0].children.Identifier[0].image);
        } else if (value.children.String != undefined) {
            value = value.children.String[0].image;
            return value.substring(1,value.length-1); //remove quotes
        } else if (value.children.Integer != undefined) {
            value = value.children.Integer[0].image;
            return BigInt(value);
        } else if (value.children.Float != undefined) {
            value = value.children.Float[0].image;
            return Number(value);
        } else if (value.children.Bytes != undefined) {
            value = value.children.Bytes[0].image;
            value = value.substring(2, value.length); //remove 0x
            let chunks = value.match(/.{1,2}/g).map((v: string) => parseInt(v, 16));
            let result = new Uint8Array(chunks);
            return result;
        } else {
            throw new Error("Could not read Value from " + value);
        }
    }
}