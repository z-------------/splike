const fsp = require("fs").promises;

const parse = require("./parse");
const Evaluator = require("./evaluator");
const intrinsics = require("./intrinsics");

function readFile(filename) {
    return fsp.readFile(filename, "utf-8");
}

function runSource(source, filename = "?") {
    let output;
    try {
        output = parse(source, filename);
    } catch (exp) {
        console.error(exp.stack);
        console.error(exp.location);
        process.exit(1);
    }

    runExprs(output);
}

function runExprs(exprs) {
    try {
        let ret;
        for (const expr of exprs) {
            ret = evaluate(expr);
        }
        return ret;
    } catch (exp) {
        console.error("Exception:", exp.stack);
    }
}

async function runFile(filename) {
    const source = await readFile(filename);
    return runSource(source, filename);
}

const globals = {};

const evaluator = new Evaluator(globals);
const evaluate = evaluator.evaluate.bind(evaluator);

const [builtins, macros] = intrinsics(globals, evaluate);
for (const name in builtins) {
    globals[name] = builtins[name];
}

evaluator.setMacros(macros);

module.exports = { runExprs, runSource, runFile };
