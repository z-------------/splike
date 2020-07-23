const p = require("../parser");
const traverse = require("../lib/traverse");

module.exports = function parse(source, filename = "?") {
    // parse
    const output = p.parse(source);

    // postprocess in-place
    traverse({ data: output }, n => {
        // add filename
        if (n.location) {
            n.location.filename = filename;
        }
        // remove any child nulls
        if (Array.isArray(n.data)) {
            let i = 0;
            while (i < n.data.length) {
                if (n.data[i] === null) n.data.splice(i, 1);
                else ++i;
            }
        }
    });

    return output;
};
