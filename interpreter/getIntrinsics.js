const NodeType = require("../nodeType");
const format = require("./format");
const Hash = require("./types/hash");

const highers = {
    // macros
    "eval": (globals, evaluate) => (scope, expr) => {
        return evaluate(expr, scope);
    },
    "def": (globals, evaluate) => (_, name, value) => {
        globals[name.data] = evaluate(value);
    },
    "fn": (globals, evaluate) => (_, ...variants) => {
        return function(scope, ...args) {
            for (const variant of variants) {
                const params = variant.data[0].data.map(n => n.data);

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
                    for (const expr of variant.data.slice(1)) {
                        result = evaluate(expr, s);
                    }
                    return result;
                }
            }
            const funcName = this.functionName ? `\`${this.functionName}\`` : "anonymous function";
            throw new TypeError(`No matching call signature for ${funcName} with arguments (${args.join(", ")}).`);
        };
    },
    "defn": (globals, evaluate) => (_, name, ...variants) => {
        globals[name.data] = globals["fn"](_, ...variants).bind({ functionName: name.data });
    },
    "defined?": (globals, evaluate) => (scope, name) => {
        return globals.hasOwnProperty(name.data) || scope.hasOwnProperty(name.data);
    },
    "if": (globals, evaluate) => (scope, condition, trueBranch, falseBranch) => {
        const cond = evaluate(condition, scope);
        if (cond) return evaluate(trueBranch, scope);
        else if (typeof falseBranch !== "undefined") return evaluate(falseBranch, scope);
    },
    "case": (globals, evaluate) => (scope, expr, ...rest) => {
        const value = evaluate(expr, scope);
        let i;
        let l = Math.floor(rest.length / 2) * 2;
        for (i = 0; i < l; i += 2) {
            const candValue = evaluate(rest[i], scope);
            if (value == candValue) {
                return evaluate(rest[i + 1], scope);
            }
        }
        if (i < rest.length) {
            return evaluate(rest[rest.length - 1], scope);
        }
    },
    "let": (globals, evaluate) => (scope, b, ...exprs) => {
        const s = {};
        if (b.type !== NodeType.Vector) throw "First argument to `let` must be a Vector.";
        for (let i = 0; i < b.data.length; i += 2) {
            s[b.data[i].data] = evaluate(b.data[i + 1], scope);
        }
        const resultScope = Object.assign({}, scope, s);
        let result;
        for (const expr of exprs) {
            result = evaluate(expr, resultScope);
        }
        return result;
    },
    "and": (globals, evaluate) => (scope, ...args) => {
        for (const arg of args) {
            const val = evaluate(arg, scope);
            if (!val) return false;
        }
        return true;
    },
    "or": (globals, evaluate) => (scope, ...args) => {
        for (const arg of args) {
            const val = evaluate(arg, scope);
            if (val) return true;
        }
        return false;
    },

    // functions
    "type": (globals, evaluate) => (_, x) => {
        return x.constructor.name;
    },
    "print": (globals, evaluate) => (_, ...stuff) => {
        console.log(...stuff.map(format));
    },
    "_subscript": (globals, evaluate) => (_, obj, i) => {
        return obj[i];
    },
    "+": (globals, evaluate) => (_, x, ...rest) => {
        return [x, ...rest].reduce((a, b) => a + b);
    },
    "*": (globals, evaluate) => (_, x, ...rest) => {
        return [x, ...rest].reduce((a, b) => a * b);
    },
    "/": (globals, evaluate) => (_, x, ...rest) => {
        if (!rest.length) return 1 / x;
        else return [x, ...rest].reduce((a, b) => a / b);
    },
    "<": (globals, evaluate) => (_, x, y) => {
        return x < y;
    },
    "_cmod": (globals, evaluate) => (_, x, y) => {
        return x % y;
    },
    "head": (globals, evaluate) => (_, list) => {
        return list[0];
    },
    "tail": (globals, evaluate) => (_, list) => {
        return list.slice(1);
    },
    "apply": (globals, evaluate) => (_, fn, ...args) => {
        return fn(_, ...args.slice(0, args.length - 1), ...args[args.length - 1]);
    },
    "cons": (globals, evaluate) => (_, x, seq) => {
        return [x, ...seq];
    },
    "hash": (globals, evaluate) => (_, entries) => {
        return new Hash(entries);
    },
};

module.exports = function getIntrinsics(globals, evaluate) {
    const builtins = {};
    for (const name in highers) {
        builtins[name] = highers[name](globals, evaluate);
    }

    const macros = ["eval", "def", "fn", "defn", "defined?", "if", "case", "let", "and", "or"]
        .map(name => builtins[name]);

    return [builtins, macros];
};
