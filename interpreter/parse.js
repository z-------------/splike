const p = require("../parser");
const traverse = require("../lib/traverse");

module.exports = function parse(source, filename = "?") {
    // parse
    const output = p.parse(source);

    // postprocess in-place
    traverse({ data: output }, n => {
        if (n.location) n.location.filename = filename;
    });

    return output;
};
