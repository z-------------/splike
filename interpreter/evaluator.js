const NodeType = require("../nodeType");
const slice = require("../lib/slice");
const Hash = require("./types/hash");

const jsGlobalPat = /.+(\/.+)+/;

const NODETYPE_LISTLIKE = NodeType.List | NodeType.QuotedList | NodeType.Vector;

module.exports = class Evaluator {
    globals;
    macros;
    stack = [];

    constructor(globals) {
        this.globals = globals;
    }

    setMacros(macros) {
        this.macros = macros;
    }

    getVal(x, scope) {
        if (scope && scope.hasOwnProperty(x)) return scope[x];
        else if (this.globals.hasOwnProperty(x)) return this.globals[x];
        // throw new ReferenceError(`Unknown identifier '${x}'.`);
        return undefined;
    }

    evalListlike(node, scope) {
        let values;
        const head = this.evaluate(node.data[0], scope);
        if (node.type === NodeType.List && this.macros.includes(head)) {
            values = [head, ...slice(node.data, 1)];
        } else {
            values = [head, ...node.data.slice(1).map(y => this.evaluate(y, scope))];
        }
        if (node.type === NodeType.List) {
            if (!(head instanceof Function)) {
                throw new TypeError(`${node.data[0].data} is not a function.`);
            }
            return head(scope, ...slice(values, 1));
        } else {
            return values;
        }
    }

    evalFieldAccess(node) {
        if (node.data[1] === "-") {
            const fieldName = node.data.substring(2);
            return function(_, obj) {
                return obj[fieldName];
            }
        } else {
            const methodName = node.data.substring(1);
            return function(_, obj, ...args) {
                return obj[methodName](...args);
            };
        }
    }

    evalGlobalAccess(node) {
        const split = node.data.split("/");
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
        for (const [key, val] of node.data) {
            entries.push(key, this.evaluate(val, scope));
        }
        return new Hash(entries);
    }

    evalIdentifier(node, scope) {
        if (node.data.startsWith(".")) {
            return this.evalFieldAccess(node);
        } else if (jsGlobalPat.test(node.data)) {
            return this.evalGlobalAccess(node);
        } else {
            return this.getVal(node.data, scope);
        }
    }
    
    evaluate(node, scope = {}) {
        // console.log(node, scope);
        this.stack.push(node);
        let value;
        try {
            if (node.type === NodeType.String) {
                value = node.data;
            } else if (node.type & NODETYPE_LISTLIKE) {
                value = this.evalListlike(node, scope);
            } else if (node.type === NodeType.Identifier) {
                value = this.evalIdentifier(node, scope);
            } else if (node.type === NodeType.Hash) {
                value = this.evalHash(node, scope);
            } else {
                value = node;
            }
        } catch (e) {
            if (!e.isProcessed) throw this.processException(e);
            else throw e;
        }
        this.stack.pop();
        return value;
    }

    processException(e) {
        const lines = [];
        lines.push(e.constructor.name + ": " + e.message);
        for (const n of this.stack.reverse()) {
            if (n.type !== NodeType.List) continue;
            const { start, filename } = n.location;
            lines.push(`    at ${n.data[0].data} (${filename}:${start.line}:${start.column})`);
        }
        e.stack = lines.join("\n");
        e.isProcessed = true;
        return e;
    }
}
