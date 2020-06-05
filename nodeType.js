const Enum = require("./lib/enum");

const NodeType = new Enum(
    "List",
    "QuotedList",
    "Vector",
    "String",
);

module.exports = NodeType;
