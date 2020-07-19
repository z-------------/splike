const NodeType = require("../nodeType");
const slice = require("../lib/slice");
const Hash = require("./types/hash");

const jsGlobalPat = /.+(\/.+)+/;

module.exports = class Evaluator {
    globals;
    macros;

    constructor(globals) {
        this.globals = globals;
    }

    getVal(x, scope) {
        if (scope && scope.hasOwnProperty(x)) return scope[x];
        else if (this.globals.hasOwnProperty(x)) return this.globals[x];
        // throw new ReferenceError(`Unknown identifier '${x}'.`);
        return undefined;
    }
    
    evaluate(node, scope = {}) {
        // console.log(node, scope);
        if ([NodeType.String].includes(node.type)) {
            return node.literal;
        } else if ([NodeType.List, NodeType.QuotedList, NodeType.Vector].includes(node.type)) {
            let values;
            const head = this.evaluate(node.items[0], scope);
            if (node.type === NodeType.List && this.macros.includes(head)) {
                values = [head, ...slice(node.items, 1)];
            } else {
                values = [head, ...node.items.slice(1).map(y => this.evaluate(y, scope))];
            }
            if (node.type === NodeType.List) {
                if (!(head instanceof Function)) {
                    throw `'${node.items[0]}' is not a function.`;
                }
                return head(scope, ...slice(values, 1));
            } else {
                return values;
            }
        } else if (typeof node === "string") {
            if (node.startsWith(".")) {
                if (node[1] === "-") {
                    const fieldName = node.substring(2);
                    return function(_, obj) {
                        return obj[fieldName];
                    }
                } else {
                    const methodName = node.substring(1);
                    return function(_, obj, ...args) {
                        return obj[methodName](...args);
                    };
                }
            } else if (jsGlobalPat.test(node)) {
                const split = node.split("/");
                let obj = globalThis;
                for (const name of slice(split, 0, split.length - 1)) {
                    obj = obj[name];
                }
                const memberName = split[split.length - 1];
                return function(_, ...args) {
                    return obj[memberName](...args);
                };
            } else {
                return this.getVal(node, scope);
            }
        } else if (node.type === NodeType.Hash) {
            const entries = [];
            for (const [key, val] of node.pairs) {
                entries.push(key, this.evaluate(val, scope));
            }
            return new Hash(entries);
        } else {
            return node;
        }
    }

    setMacros(macros) {
        this.macros = macros;
    }
}
