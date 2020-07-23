module.exports = isQuiet =>
    isQuiet
        ? function() {}
        : function(...stuff) { console.log(...stuff); };
