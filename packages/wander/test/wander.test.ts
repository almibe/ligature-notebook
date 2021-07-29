/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { readdirSync, readFileSync } from 'fs';
import { WanderInterpreter, write } from '../lib/index';
import { ast } from './ASTs';

//add wander files names below when you only want to run a set number of tests, leave empty to test all
const runOnly: Array<string> = ['let-res.wander'];

describe('Wander AST tests', () => {
    const wander = new WanderInterpreter();    
    readdirSync(__dirname + "/resources").forEach(dir => {
        readdirSync(__dirname + "/resources/" + dir).forEach(testFile => {
            if (testFile.endsWith("wander") && (runOnly.length == 0 || runOnly.indexOf(testFile) != -1)) {
                test(testFile, () => {
                    const script = readFileSync(__dirname + "/resources/" + dir + "/" + testFile);
                    const result = wander.createAst(script.toString());
                    const expected = ast[testFile];
                    expect(result).toEqual(expected);
                })
            }
        });
    });
});

describe('Wander eval tests', () => {
    const wander = new WanderInterpreter();    
    readdirSync(__dirname + "/resources").forEach(dir => {
        readdirSync(__dirname + "/resources/" + dir).forEach(testFile => {
            if (testFile.endsWith("wander") && (runOnly.length == 0 || runOnly.indexOf(testFile) != -1)) {
                test(testFile, () => {
                    const script = readFileSync(__dirname + "/resources/" + dir + "/" + testFile);
                    const expected = readFileSync(__dirname + "/resources/" + dir + "/" + testFile.replace(/\.wander$/, ".result"));
                    const result = wander.run(script.toString());
                    expect(write(result)).toMatch(expected.toString());
                })
            }
        });
    });
});
