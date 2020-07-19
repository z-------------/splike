const NodeType = require("../nodeType");
const format = require("./format");
const Hash = require("./types/hash");

module.exports = function getIntrinsics(globals, evaluate) {
    const builtins = {
        // macros
        "eval": (scope, expr) => {
            return evaluate(expr, scope);
        },
        "def": (_, name, value) => {
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
        "case": (scope, expr, ...rest) => {
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
        "print": (_, ...stuff) => {
            console.log(...stuff.map(format));
        },
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
        "<": (_, x, y) => {
            return x < y;
        },
        "_cmod": (_, x, y) => {
            return x % y;
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
        "hash": (_, entries) => {
            return new Hash(entries);
        },
    };

    const macros = ["eval", "def", "fn", "defn", "defined?", "if", "case", "let", "and", "or"]
        .map(name => builtins[name]);

    return [builtins, macros];
};
