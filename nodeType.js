const Enum = require("./lib/enum");

const NodeType = new Enum(
    "List",
    "QuotedList",
    "Vector",
    "Hash",
    "String",
);

module.exports = NodeType;
