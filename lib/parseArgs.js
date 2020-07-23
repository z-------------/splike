const patFlag = /^-([A-z])$/;
const patOpt = /^--([A-z]+)(=([A-z0-9]+))?$/;

module.exports = function parseArgs(args) {
    const d = {
        _: [],
    };
    for (const arg of args) {
        let match;
        if (match = arg.match(patFlag)) {
            d[match[1]] = true;
        } else if (match = arg.match(patOpt)) {
            d[match[1]] = match[3] || true;
        } else {
            d._.push(arg);
        }
    }
    return d;
};
