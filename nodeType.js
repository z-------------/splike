const Enum = require("./lib/enum");

const NodeType = new Enum(
    "List",
    "QuotedList",
    "Vector",
    "Hash",
    "String",
    "Identifier",
);

module.exports = NodeType;
