const commentsParser = require("../commentsParser");
const grammarParser = require("../grammarParser");
const traverse = require("../lib/traverse");

module.exports = function parse(source, filename = "?") {
    // parse
    const output = grammarParser.parse(commentsParser.parse(source));

    // postprocess in-place
    traverse({ data: output }, n => {
        // add filename
        if (n.location) {
            n.location.filename = filename;
        }
    });

    return output;
};
