const NodeType = require("../nodeType");
const slice = require("../lib/slice");
const Hash = require("./types/hash");

const jsGlobalPat = /.+(\/.+)+/;

const listlikeNodeTypes = [NodeType.List, NodeType.QuotedList, NodeType.Vector];

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

    evalListlike(node, scope) {
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
    }

    evalFieldAccess(node) {
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
    }

    evalGlobalAccess(node) {
        const split = node.split("/");
        let obj = globalThis;
        for (const name of slice(split, 0, split.length - 1)) {
            obj = obj[name];
        }
        const memberName = split[split.length - 1];
        return function(_, ...args) {
            return obj[memberName](...args);
        };
    }

    evalHash(node, scope) {
        const entries = [];
        for (const [key, val] of node.pairs) {
            entries.push(key, this.evaluate(val, scope));
        }
        return new Hash(entries);
    }

    evalIdentifier(node, scope) {
        if (node.startsWith(".")) {
            return this.evalFieldAccess(node);
        } else if (jsGlobalPat.test(node)) {
            return this.evalGlobalAccess(node);
        } else {
            return this.getVal(node, scope);
        }
    }
    
    evaluate(node, scope = {}) {
        // console.log(node, scope);
        if (node.type === NodeType.String) {
            return node.literal;
        } else if (listlikeNodeTypes.includes(node.type)) {
            return this.evalListlike(node, scope);
        } else if (typeof node === "string") {
            return this.evalIdentifier(node, scope);
        } else if (node.type === NodeType.Hash) {
            return this.evalHash(node, scope);
        } else {
            return node;
        }
    }

    setMacros(macros) {
        this.macros = macros;
    }
}
