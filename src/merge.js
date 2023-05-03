const diff = require('deep-diff').diff,
    merge = require('deepmerge');

/**
 * 
 * @param {Object} spec1 - Schema from Postman's private API network
 * @param {Object} spec2 - Schema generated using New Relic
 */
function mergeOpenApiSpec (spec1, spec2) {
    const specDiff = diff(spec1.paths, spec2.paths), // What has changed in New Relic?

        // a temp OAS definition which will be populated with the changes and later be merged with schema in Postman
        openApiSpec = {info: {}, paths: {}}; //

    if (!specDiff) {
        throw new Error('No diff found');
    }

    specDiff.forEach((diff) => {
        if (diff.kind === 'N') {
            patch = {
                type: 'Added',
                path: diff.path,
                value: diff.rhs
            };
        }

        if (diff.kind === 'N' && diff.path && diff.path.length === 1) {
            openApiSpec.paths[diff.path[0]] = diff.rhs;
        }

        if (diff.kind === 'N' && diff.path && diff.path.length === 2) {
            if (openApiSpec.paths[diff.path[0]]) {
                openApiSpec.paths[diff.path[0]][diff.path[1]] = diff.rhs;
            } else {
                openApiSpec.paths = {
                    [diff.path[0]]: {
                        [diff.path[1]]: diff.rhs
                    }
                }
            }
        }
    });

    const mergedSchema = merge(spec1, openApiSpec);

    return mergedSchema;
}

module.exports = {
    mergeOpenApiSpec
};
