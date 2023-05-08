const fs = require('fs'),
    diff = require('deep-diff').diff;

function compareOpenApiSpec (spec1, spec2) {
    const specDiff = diff(spec1.paths, spec2.paths),
        patchObj = [];

    specDiff.forEach((diff) => {
        let patch;

        if (diff.kind === 'N') {
            patch = {
                type: 'Added',
                path: diff.path,
                value: diff.rhs
            };
        }

        if (diff.kind === 'D') {
            patch = {
                type: 'Deleted',
                path: diff.path,
                value: diff.rhs
            };
        }

        patch && patchObj.push(patch);
    })

    fs.writeFile('assets/diff/diff.json', JSON.stringify(patchObj, null, 2), (err) => {
        if (err) throw err;

        console.log('Saved the diff inside assets/diff folder');
    });
}

module.exports = {
    compareOpenApiSpec
};
