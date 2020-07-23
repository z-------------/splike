const format = require("../format");

module.exports = class Hash {
    m = new Map();

    constructor(entries) {
        for (let i = 0; i < entries.length; i += 2) {
            this.m.set(entries[i], entries[i + 1]);
        }
    }

    set(key, val) { this.m.set(key, val); return this; }
    get(key) { return this.m.get(key); }
    has(key) { return this.m.has(key); }
    del(key) { this.m.delete(key); return this; }
    get keys() { return [...this.m.keys()]; }
    get size() { return this.m.size; }

    inspect() {
        return "{" + [...this.m.entries()].map(([key, val]) => `${key} ${format(val)}`).join(", ") + "}";
    }
};
