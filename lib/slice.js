function* slice(arr, start, end) {
    if (typeof end === "undefined") {
        end = arr.length;
    }
    let curr = start;
    while (curr < end) {
        yield arr[curr++];
    }
}

module.exports = slice;

if (require.main === module) {
    const a = [0, 1, 2, 3];
    for (const x of slice(a, 1)) {
        console.log(x);
    }
}
