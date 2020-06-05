const Enum = require("./lib/enum");

const NodeType = new Enum(
    "Empty",
    "ListExpr",
    "SquareList",
    "StringLiteral",
);

module.exports = NodeType;
