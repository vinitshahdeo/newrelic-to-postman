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

async function getBundledSchema (apiId, schemaId) {
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

async function getSchema (apiId, schemaId) {
    const options = {
            headers: {
                Accept: 'application/vnd.api.v10+json',
                'X-Api-Key': config['postmanApiKey']
            }
        },
        response = await fetch(`${config['postmanBaseUrl']}/apis/${apiId}/schemas/${schemaId}`, options);

    return response.json();
}

async function updateSchema (apiId, schemaId, filePath, fileContent, format) {
    const updatedSchema = format === 'json' ? JSON.stringify(fileContent, null, 4) : fileContent,
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

async function createCollection (data, workspaceId) {
    const options = {
            method: 'post',
            headers: {
                'X-Api-Key': config['postmanApiKey']
            },
            body: JSON.stringify(data)
        },
        params = new URLSearchParams({
            workspace: workspaceId
        }),
        response = await fetch(`${config['postmanBaseUrl']}/collections?${params}`, options);

    return response.json();
}

async function createAPIExclusiveCollection (data, apiId) {
    const options = {
            method: 'post',
            headers: {
                Accept: 'application/vnd.api.v10+json',
                'X-Api-Key': config['postmanApiKey']
            },
            body: JSON.stringify({
                operationType: 'CREATE_NEW',
                data
            })
        },
        response = await fetch(`${config['postmanBaseUrl']}/apis/${apiId}/collections`, options);

    return response.json();
}

module.exports = {
    getApi,
    getSchema,
    getBundledSchema,
    updateSchema,
    getCollection,
    createCollection,
    createAPIExclusiveCollection
}
