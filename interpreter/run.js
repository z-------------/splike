const fsp = require("fs").promises;
const util = require("util");

const p = require("../parser");

const log = require("../lib/debugLog");
const traverse = require("../lib/traverse");

const Evaluator = require("./evaluator");
const getIntrinsics = require("./getIntrinsics");

function sectionHeading(label) {
    return log("=".repeat(process.stdout.columns) + "\n" + label + ":");
}

function formatHRTime([seconds, nanoseconds]) {
    return `${seconds}.${nanoseconds.toString().padStart(9, "0")}s`;
}

function readFile(filename) {
    return fsp.readFile(filename, "utf-8");
}

function processTree(root, { filename }) {
    traverse(root, n => {
        if (n.location) n.location.filename = filename;
    });
}

async function runFile(filename) {
    sectionHeading("SOURCE");

    const readStartTime = process.hrtime();
    const source = await readFile(filename);
    const readDiffTime = process.hrtime(readStartTime);
    log(source);
    log(`Read in ${formatHRTime(readDiffTime)}.`);

    sectionHeading("PARSE");

    const parseStartTime = process.hrtime();

    // parse
    let output;
    try {
        output = p.parse(source);
    } catch (exp) {
        console.error(exp.stack);
        console.error(exp.location);
        process.exit(1);
    }

    // process
    processTree({ data: output }, { filename });

    const parseDiffTime = process.hrtime(parseStartTime);
    log(util.inspect(output, { showHidden: false, depth: null }));
    log(`Parsed in ${formatHRTime(parseDiffTime)}.`);

    sectionHeading("OUTPUT");
    
    const runStartTime = process.hrtime();
    try {
        for (const expr of output) {
            evaluate(expr);
        }
    } catch (exp) {
        console.error("Exception:", exp.stack);
    }
    const runDiffTime = process.hrtime(runStartTime);
    log(`Ran in ${formatHRTime(runDiffTime)}.`)
}

const globals = {};

/* builtins */

const evaluator = new Evaluator(globals);
const evaluate = evaluator.evaluate.bind(evaluator);

const [builtins, macros] = getIntrinsics(globals, evaluate);
for (const name in builtins) {
    globals[name] = builtins[name];
}

evaluator.setMacros(macros);

/* load and run */

(async () => {
    for (const filename of ["std.splike", "test.splike"]) {
        await runFile(filename);
    }
})();
