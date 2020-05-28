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
    // console.log(thing, scope);
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
    } else if (Array.isArray(thing)) {
        return thing.map(item => evaluate(item, scope));
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
                const params = variant.head.elements;

                let namedParamCount = 0;
                const hasRestParam = params.includes("&");
                const restOpIdx = hasRestParam ? params.indexOf("&") : params.length;
                if (hasRestParam && (restOpIdx !== params.lastIndexOf("&") || restOpIdx == params.length - 1)) {
                    throw new SyntaxError("Invalid use of &-operator.");
                }
                for (let i = 0; i < params.length; ++i) {
                    const param = params[i];
                    if (param === "&" || i > 0 && params[i - 1] === "&") continue;
                    ++namedParamCount;
                }
                const restParamName = params[restOpIdx + 1];

                if (namedParamCount === args.length || hasRestParam && namedParamCount <= args.length) {
                    const s = {};
                    Object.assign(s, scope);
                    for (let i = 0; i < restOpIdx; ++i) {
                        s[params[i]] = args[i];
                    }
                    for (let i = 0; i < params.length; ++i) {
                        const argsI = args.length - 1 - i;
                        const paramsI = params.length - 1 - i;
                        if (paramsI <= restOpIdx + 1) break;
                        s[params[paramsI]] = args[argsI];
                    }
                    if (hasRestParam) {
                        s[restParamName] = args.slice(restOpIdx, restOpIdx + args.length - namedParamCount);
                    }
                    // console.log(params, args, s);
                    let result = [];
                    for (const expr of variant.tail) {
                        result = evaluate(expr, s);
                    }
                    return result;
                }
            }
            throw new TypeError(`No matching call signature for \`${name}\` with arguments (${args.join(" ")}).`);
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
    "type": (_, x) => {
        return x.constructor.name;
    },
    "print": (_, ...stuff) => { console.log(...stuff); },
    "+": (_, x, ...rest) => {
        let s = x;
        for (const it of rest) s += it;
        return s;
    },
    "*": (_, x, ...rest) => {
        let p = x;
        for (const it of rest) p *= it;
        return p;
    },
    "=": (_, x, y) => {
        return x == y;
    },
    "<": (_, x, y) => {
        return x < y;
    },
    "head": (_, x, ...rest) => {
        return x;
    },
    "tail": (_, x, ...rest) => {
        return rest;
    },
    "apply": (_, fn, ...args) => {
        return fn(_, ...args.slice(0, args.length - 1), ...args[args.length - 1]);
    },
    "cons": (_, x, seq) => {
        return [x, ...seq];
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
        // output = p.parse(source);
    } catch (exp) {
        console.error(exp.stack);
        console.error(exp.location);
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
