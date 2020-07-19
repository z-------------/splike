class Enum {
    constructor(...args) {
        for (let i = 0, l = args.length; i < l; ++i) {
            this[args[i]] = i;
        }
    }
}

module.exports = Enum;
