module.exports = function format(obj) {
    return (obj instanceof Object && "inspect" in obj) ? obj.inspect() : obj;
};
