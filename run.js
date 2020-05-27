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
        const fn = getVal(thing.fn, scope);
        if (!(fn instanceof Function)) {
            throw `'${thing.fn}' is not a function.`;
        }
        if (noEvalForms.includes(thing.fn)) {
            return fn(scope, ...thing.operands.map(operand => {
                if (type(operand) === "ListExpr") return operand;
                else if (typeof operand === "string") return { type: "Token", source: operand };
                else return evaluate(operand, scope);
            }));
        } else {
            return fn(scope, ...thing.operands.map(operand => evaluate(operand, scope)));
        }
    } else if (typeof thing === "string") {
        return getVal(thing, scope);
    } else {
        return thing;
    }
}

const noEvalForms = ["def", "defined?", "if", "let"];

const globals = {
    "def": (scope, name, value) => {
        if (type(name) !== "Token") throw "Invalid left-hand side in `def`."
        globals[name.source] = value;
    },
    "defined?": (scope, name) => {
        return name.source in globals;
    },
    "if": (scope, condition, trueBranch, falseBranch) => {
        const cond = evaluate(condition, scope);
        if (cond) return evaluate(trueBranch, scope);
        else return evaluate(falseBranch, scope);
    },
    "let": (scope, b, ...exprs) => {
        if (type(b) !== "SquareList") throw "First argument must be a squarelist.";
        for (let i = 0; i < b.elements.length; i += 2) {
            scope[b.elements[i]] = evaluate(b.elements[i + 1]);
        }
        for (const expr of exprs) {
            evaluate({ type: "ListExpr", fn: expr.fn, operands: expr.operands }, scope);
        }
    },
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
    ">": (_, x, y) => {
        return x > y;
    },
};

(async () => {
    log("SOURCE:")

    const source = await fsp.readFile("test.lisplike", "utf-8");
    log(source);

    log("=".repeat(process.stdout.columns));
    
    log("PARSE:")

    let output;
    try {
        output = p.parse(source);
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