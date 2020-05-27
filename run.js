const fsp = require("fs").promises;
const util = require("util");

const p = require("./parser");

const log = process.argv[2] === "-q" ? function() {} : function(...stuff) { console.log(...stuff); }

function type(x) {
    return x.type;
}

function getVal(x, scope) {
    if (scope && scope.hasOwnProperty(x)) return scope[x];
    else if (globals.hasOwnProperty(x)) return globals[x];
    throw new ReferenceError(`Unknown identifier '${x}'.`);
}

function evaluate(thing, scope = {}) {
    // console.log(thing);
    if (thing.hasOwnProperty("literal")) {
        return thing.literal;
    } else if (type(thing) === "ListExpr") {
        if (type(thing.head) === "Empty") return;
        const fn = getVal(thing.head, scope);
        if (!(fn instanceof Function)) {
            throw `'${thing.head}' is not a function.`;
        }
        if (noEvalForms.includes(thing.head)) {
            return fn(scope, ...thing.tail);
        } else {
            return fn(scope, ...thing.tail.map(y => evaluate(y, scope)));
        }
    } else if (typeof thing === "string") {
        return getVal(thing, scope);
    } else {
        return thing;
    }
}

const noEvalForms = ["def", "defn", "defined?", "if", "let", "and", "or"];

const globals = {
    // macros
    "def": (scope, name, value) => {
        globals[name] = evaluate(value);
    },
    "defn": (_, name, ...variants) => {
        globals[name] = function(scope, ...args) {
            for (const variant of variants) {
                if (variant.head.elements.length === args.length) {
                    const s = {};
                    Object.assign(s, scope);
                    for (let i = 0; i < variant.head.elements.length; ++i) {
                        const parameter = variant.head.elements[i];
                        s[parameter] = args[i];
                    }
                    let result = [];
                    for (const expr of variant.tail) {
                        result = evaluate(expr, s);
                    }
                    return result;
                }
                throw new TypeError(`No matching call signature for \`${name}\` with arguments (${args.join(" ")}).`);
            }
        };
    },
    "defined?": (scope, name) => {
        return name in globals;
    },
    "if": (scope, condition, trueBranch, falseBranch) => {
        const cond = evaluate(condition, scope);
        if (cond) return evaluate(trueBranch, scope);
        else return evaluate(falseBranch, scope);
    },
    "let": (scope, b, ...exprs) => {
        if (type(b) !== "SquareList") throw "First argument to `let` must be a squarelist.";
        for (let i = 0; i < b.elements.length; i += 2) {
            scope[b.elements[i]] = evaluate(b.elements[i + 1]);
        }
        for (const expr of exprs) {
            evaluate({ type: "ListExpr", head: expr.head, tail: expr.tail }, scope);
        }
    },
    "and": (scope, ...args) => {
        for (const arg of args) {
            if (!evaluate(arg, scope)) return false;
        }
        return true;
    },
    "or": (scope, ...args) => {
        for (const arg of args) {
            if (evaluate(arg, scope)) return true;
        }
        return false;
    },

    // functions
    "print": (_, ...stuff) => { console.log(...stuff); },
    "+": (_, x, ...rest) => {
        let s = x;
        for (const it of rest) s += it;
        return s;
    },
    "-": (_, x, ...rest) => {
        return globals["+"](_, x, ...rest.map(n => -n));
    },
    "=": (_, x, y) => {
        return x == y;
    },
    "<": (_, x, y) => {
        return x < y;
    },
};

(async () => {
    log("SOURCE:")

    const stdSource = await fsp.readFile("std.lisplike", "utf-8");
    const source = await fsp.readFile("test.lisplike", "utf-8");
    log(source);

    log("=".repeat(process.stdout.columns));
    
    log("PARSE:")

    let output;
    try {
        output = p.parse([stdSource, source].join("\n"));
    } catch (exp) {
        console.error(exp.stack);
        process.exit(1);
    }
    log(util.inspect(output, { showHidden: false, depth: null }));

    log("=".repeat(process.stdout.columns));

    log("OUTPUT:")

    try {
        for (const expr of output) {
            evaluate(expr);
        }
    } catch (exp) {
        console.error("Exception:", exp);
    }
})();