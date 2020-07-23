const fsp = require("fs").promises;
const util = require("util");

const parse = require("./parse");
const Evaluator = require("./evaluator");
const intrinsics = require("./intrinsics");

const debugLog = require("../lib/debugLog");
const parseArgs = require("../lib/parseArgs");

const args = parseArgs(process.argv.slice(2));

const log = debugLog(args.q);

function sectionHeading(label) {
    return log("=".repeat(process.stdout.columns) + "\n" + label + ":");
}

function formatHRTime([seconds, nanoseconds]) {
    return `${seconds}.${nanoseconds.toString().padStart(9, "0")}s`;
}

function readFile(filename) {
    return fsp.readFile(filename, "utf-8");
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

    let output;
    try {
        output = parse(source, filename);
    } catch (exp) {
        console.error(exp.stack);
        console.error(exp.location);
        process.exit(1);
    }

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

const [builtins, macros] = intrinsics(globals, evaluate);
for (const name in builtins) {
    globals[name] = builtins[name];
}

evaluator.setMacros(macros);

/* load and run */

(async () => {
    for (const filename of ["std.splike", ...args._.map(n => n + ".splike")]) {
        await runFile(filename);
    }
})();
