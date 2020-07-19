const format = require("../format");

module.exports = class Hash {
    m = new Map();

    constructor(entries) {
        for (let i = 0; i < entries.length; i += 2) {
            this.m.set(entries[i], entries[i + 1]);
        }
    }

    set(key, val) { return this.m.set(key, val); }
    get(key, val) { return this.m.get(key); }
    has(key) { return this.m.has(key); }
    del(key) { return this.m.delete(key); }
    get size() { return this.m.size; }

    inspect() {
        return "{" + [...this.m.entries()].map(([key, val]) => `${key} ${format(val)}`).join(", ") + "}";
    }
};
