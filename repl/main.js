const readline = require("readline");
const parse = require("../interpreter/parse");
const { runExprs, runFile } = require("../interpreter/run");

function writePrompt() {
    if (buffer.length === 0) {
        process.stdout.write("> ");
    } else {
        process.stdout.write("... ");
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

let buffer = "";

runFile("std.splike").then(() => {
    writePrompt();

    rl.on("line", line => {
        buffer += !buffer.length ? line : ("\n" + line);
        let exprs;
        try {
            exprs = parse(buffer, "repl");
            buffer = ""; // this doesn't happen if `parse` throws
        } catch (e) {
            if (e.found !== null) {
                buffer = "";
                console.error(e.stack);
            }
            // if e.found is null (= end of input), parser is expecting more
            //     input, so read some more.
            // otherwise, the input cannot become valid, so throw.
            // (is the reasoning here correct? who knows.)
        }
        if (exprs) {
            const ret = runExprs(exprs);
            console.log(ret);
        }

        writePrompt();
    });

    rl.on("SIGINT", () => {
        console.error("^C");
        if (buffer.length > 0) {
            buffer = "";
            writePrompt();
        } else {
            process.exit();
        }
    });
});
