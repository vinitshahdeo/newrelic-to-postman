const mapping = require('../mapping.json'),
    fetch = require('node-fetch'),
    config = require('../config.json');

async function getApi (apiId) {
    const options = {
            headers: {
                Accept: 'application/vnd.api.v10+json',
                'X-Api-Key': config['postmanApiKey']
            }
        },
        params = new URLSearchParams({
            include: 'versions, schemas'
        }),
        response = await fetch(`${config['postmanBaseUrl']}/apis/${apiId}?${params}`, options);

    return response.json();
}

async function getSchema (apiId, schemaId) {
    const options = {
            headers: {
                Accept: 'application/vnd.api.v10+json',
                'X-Api-Key': config['postmanApiKey']
            }
        },
        params = new URLSearchParams({
            bundled: true
        }),
        response = await fetch(`${config['postmanBaseUrl']}/apis/${apiId}/schemas/${schemaId}?${params}`, options);

    return response.json();
}

async function updateSchema (apiId, schemaId, filePath, fileContent) {
    const updatedSchema = JSON.stringify(fileContent, null, 4),
        options = {
            method: 'put',
            body: JSON.stringify({
                content: updatedSchema
            }),
            headers: {
                Accept: 'application/vnd.api.v10+json',
                'X-Api-Key': config['postmanApiKey']
            }
        },
        response = await fetch(`${config['postmanBaseUrl']}/apis/${apiId}/schemas/${schemaId}/files/${filePath}`, options);

    return response.json();
}

async function getCollection (collectionId) {
    const options = {
            headers: {
                'X-Api-Key': config['postmanApiKey']
            }
        },
        response = await fetch(`${config['postmanBaseUrl']}/collections/${collectionId}`, options);

    return response.json();
}


module.exports = {
    getApi,
    getSchema,
    updateSchema,
    getCollection
}
