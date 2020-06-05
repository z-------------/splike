const fsp = require("fs").promises;
const util = require("util");

const p = require("./parser");
const NodeType = require("./nodeType");
const slice = require("./lib/slice");

const log = process.argv[2] === "-q" ? function() {} : function(...stuff) { console.log(...stuff); }

function formatHRTime([seconds, nanoseconds]) {
    return `${seconds}.${nanoseconds.toString().padStart(9, "0")}s`;
}

function readFile(filename) {
    return fsp.readFile(filename, "utf-8");
}

async function runFile(filename) {
    log("=".repeat(process.stdout.columns));

    log("SOURCE:")

    const readStartTime = process.hrtime();
    const source = await readFile(filename);
    const readDiffTime = process.hrtime(readStartTime);
    log(source);
    log(`Read in ${formatHRTime(readDiffTime)}.`);

    log("=".repeat(process.stdout.columns));

    log("PARSE:")

    const parseStartTime = process.hrtime();
    let output;
    try {
        output = p.parse(source);
    } catch (exp) {
        console.error(exp.stack);
        console.error(exp.location);
        process.exit(1);
    }
    const parseDiffTime = process.hrtime(parseStartTime);
    log(util.inspect(output, { showHidden: false, depth: null }));
    log(`Parsed in ${formatHRTime(parseDiffTime)}.`);

    log("=".repeat(process.stdout.columns));

    log("OUTPUT:")
    
    const runStartTime = process.hrtime();
    try {
        for (const expr of output) {
            evaluate(expr);
        }
    } catch (exp) {
        console.error("Exception:", exp);
    }
    const runDiffTime = process.hrtime(runStartTime);
    log(`Ran in ${formatHRTime(runDiffTime)}.`)
}

function getVal(x, scope) {
    if (scope && scope.hasOwnProperty(x)) return scope[x];
    else if (globals.hasOwnProperty(x)) return globals[x];
    // throw new ReferenceError(`Unknown identifier '${x}'.`);
    return undefined;
}

function evaluate(node, scope = {}) {
    // console.log(node, scope);
    if ([NodeType.String].includes(node.type)) {
        return node.literal;
    } else if ([NodeType.List, NodeType.QuotedList, NodeType.Vector].includes(node.type)) {
        let values;
        const head = evaluate(node.items[0], scope);
        if (node.type === NodeType.List && macros.includes(head)) {
            values = [head, ...slice(node.items, 1)];
        } else {
            values = [head, ...node.items.slice(1).map(y => evaluate(y, scope))];
        }
        if (node.type === NodeType.List) {
            if (!(head instanceof Function)) {
                throw `'${node.items[0]}' is not a function.`;
            }
            return head(scope, ...slice(values, 1));
        } else {
            return values;
        }
    } else if (typeof node === "string") {
        if (node.startsWith(".")) {
            if (node[1] === "-") {
                const fieldName = node.substring(2);
                return function(_, obj) {
                    return obj[fieldName];
                }
            } else {
                const methodName = node.substring(1);
                return function(_, obj, ...args) {
                    return obj[methodName](...args);
                };
            }
        } else if (node.includes("/")) {
            const split = node.split("/");
            let obj = globalThis;
            for (const name of slice(split, 0, split.length - 1)) {
                obj = obj[name];
            }
            return obj[split[split.length - 1]];
        } else {
            return getVal(node, scope);
        }
    } else if (node.type === NodeType.Hash) {
        const entries = [];
        for (const [key, val] of node.pairs) {
            entries.push(key, evaluate(val, scope));
        }
        return new Hash(entries);
    } else {
        return node;
    }
}

const globals = {
    // macros
    "def": (scope, name, value) => {
        globals[name] = evaluate(value);
    },
    "fn": (_, ...variants) => {
        return function(scope, ...args) {
            for (const variant of variants) {
                const params = variant.items[0].items;

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
                    for (const expr of variant.items.slice(1)) {
                        result = evaluate(expr, s);
                    }
                    return result;
                }
            }
            const funcName = this.functionName ? `\`${this.functionName}\`` : "anonymous function";
            throw new TypeError(`No matching call signature for ${funcName} with arguments (${args.join(" ")}).`);
        };
    },
    "defn": (_, name, ...variants) => {
        globals[name] = globals["fn"](_, ...variants).bind({ functionName: name });
    },
    "defined?": (scope, name) => {
        return globals.hasOwnProperty(name) || scope.hasOwnProperty(name);
    },
    "if": (scope, condition, trueBranch, falseBranch) => {
        const cond = evaluate(condition, scope);
        if (cond) return evaluate(trueBranch, scope);
        else if (typeof falseBranch !== "undefined") return evaluate(falseBranch, scope);
    },
    "let": (scope, b, ...exprs) => {
        const s = {};
        if (b.type !== NodeType.Vector) throw "First argument to `let` must be a Vector.";
        for (let i = 0; i < b.items.length; i += 2) {
            s[b.items[i]] = evaluate(b.items[i + 1], scope);
        }
        const resultScope = Object.assign({}, scope, s);
        let result;
        for (const expr of exprs) {
            result = evaluate(expr, resultScope);
        }
        return result;
    },
    "and": (scope, ...args) => {
        for (const arg of args) {
            const val = evaluate(arg, scope);
            if (!val) return false;
        }
        return true;
    },
    "or": (scope, ...args) => {
        for (const arg of args) {
            const val = evaluate(arg, scope);
            if (val) return true;
        }
        return false;
    },

    // functions
    "type": (_, x) => {
        return x.constructor.name;
    },
    "print": (_, ...stuff) => { console.log(...stuff); },
    "die": (_, ...stuff) => {
        console.error("Fatal:", ...stuff);
        process.exit(1);
    },
    "_subscript": (_, obj, i) => {
        return obj[i];
    },
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
    "/": (_, x, ...rest) => {
        if (!rest.length) return 1 / x;
        else {
            let q = x;
            for (const it of rest) q /= it;
            return q;
        }
    },
    "=": (_, x, y) => {
        return x == y;
    },
    "<": (_, x, y) => {
        return x < y;
    },
    "head": (_, list) => {
        return list[0];
    },
    "tail": (_, list) => {
        return list.slice(1);
    },
    "apply": (_, fn, ...args) => {
        return fn(_, ...args.slice(0, args.length - 1), ...args[args.length - 1]);
    },
    "cons": (_, x, seq) => {
        return [x, ...seq];
    },
    "floor": (_, x) => {
        return Math.floor(x);
    },
    "hash": (_, entries) => {
        return new Hash(entries);
    },
};

const macroNames = ["def", "fn", "defn", "defined?", "if", "let", "and", "or"];
const macros = macroNames.map(name => globals[name]);

class Hash {
    m = new Map();

    constructor(entries) {
        for (let i = 0; i < entries.length; i += 2) {
            this.m.set(entries[i], entries[i + 1]);
        }
    }

    set(key, val) { return this.m.set(key, val); }
    get(key, val) { return this.m.get(key, val); }
    has(key) { return this.m.has(key); }
    del(key) { return this.m.delete(key); }
    get size() { return this.m.size; }

    toString() { return this.m.toString(); }
}

(async () => {
    for (const filename of ["std.splike", "test.splike"]) {
        await runFile(filename);
    }
})();
