const readline = require("readline");
const parse = require("../interpreter/parse");
const { runExprs, runFile } = require("../interpreter/run");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

let buffer = "";

runFile("std.splike").then(() => {
    rl.on("line", line => {
        buffer += line + "\n";
        try {
            const exprs = parse(buffer, "repl");
            buffer = "";
            const ret = runExprs(exprs);
            console.log(ret);
        } catch (e) {
            // the buffer content is not (yet) valid code.
            // read some more.
        }
    });

    rl.on("SIGINT", () => {
        console.error("^C");
        if (buffer.length > 0) {
            buffer = "";
        } else {
            process.exit();
        }
    });
});
