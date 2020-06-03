class Enum {
    constructor(...args) {
        if (args.length > 1) { // automatic values
            for (let i = 0, l = args.length; i < l; ++i) {
                this[args[i]] = i;
            }
        } else { // explicit values
            // args[0] is { [name0]: value0, ... }
            for (const name in args[0]) {
                this[name] = args[0][name];
            }
        }
    }
}

module.exports = Enum;
