const openapiDiff = require('openapi-diff'),
    merge = require('deepmerge');

async function mergeSchema(source, destination) {
    const result = await openapiDiff.diffSpecs({
        sourceSpec: {
            content: JSON.stringify(source),
            location: 'source.json',
            format: 'openapi3'
        },
        destinationSpec: {
            content: JSON.stringify(destination),
            location: 'destination.json',
            format: 'openapi3'
        }
    }),

        // a temp OAS definition which will be populated with the changes and later be merged with schema in Postman
        openApiSpec = { info: {}, paths: {} },

        // We care about only newly added paths and methods
        nonBreakingDifferences = result.nonBreakingDifferences;

    nonBreakingDifferences.forEach((item) => {
        if (item.action === 'add' && item.code === 'path.add') {
            const path = item.destinationSpecEntityDetails[0].location.split('.')[1];
            openApiSpec.paths[path] = item.destinationSpecEntityDetails[0].value;
        }

        if (item.action === 'add' && item.code === 'method.add') {
            const entityDetails = item.destinationSpecEntityDetails[0].location.split('.');

            if (openApiSpec.paths[entityDetails[1]]) {
                openApiSpec.paths[entityDetails[1]][entityDetails[2]] = item.destinationSpecEntityDetails[0].value
            } else {
                openApiSpec.paths[entityDetails[1]] = {
                    [entityDetails[2]]: item.destinationSpecEntityDetails[0].value
                }
            }
        }
    });

    return merge(source, openApiSpec);
}

module.exports = {
    mergeSchema
};
