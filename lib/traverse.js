function traverse(root, f, childrenProperty = "data") {
    f(root);
    const children = root[childrenProperty];
    if (!children || !Array.isArray(children) || children.length === 0) return;
    for (const child of root[childrenProperty]) {
        traverse(child, f, childrenProperty);
    }
}

module.exports = traverse;

if (require.main === module) {
    const assert = require("assert");

    const root = {
        l: 0,
        c: [{
            l: 1,
            c: [{
                l: 2,
            }, {
                l: 3,
            }],
        }, {
            l: 4,
        }]
    };
    const out = [];
    traverse(root, n => out.push(n.l), "c");
    assert.deepStrictEqual(out, [0, 1, 2, 3, 4]);
}
