const { runFile } = require("./run");
const parseArgs = require("../lib/parseArgs");

const args = parseArgs(process.argv.slice(2));

(async () => {
    for (const filename of ["std.splike", ...args._.map(n => n + ".splike")]) {
        await runFile(filename);
    }
})();
