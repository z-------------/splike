class Enum {
    constructor(...args) {
        let j = 1;
        for (let i = 0; i < args.length; ++i) {
            this[args[i]] = j;
            j = j << 1;
        }
    }
}

module.exports = Enum;
