const isQuiet = process.argv[2] === "-q";

module.exports = isQuiet
    ? function() {}
    : function(...stuff) { console.log(...stuff); };
