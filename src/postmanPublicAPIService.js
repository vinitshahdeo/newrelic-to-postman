const _ = require('lodash'),
    request = require('request'),
    config = require('../config.json'),
    POSTMAN_PUBLIC_API_URL = 'https://api.getpostman-stage.com',
    CREATE_COLLECTIONS_ENDPOINT = '/collections',
    HEADERS = {
        'X-Api-Key': config.postmanAPIKey
    };


/**
 * Creates a collection in Postman workspace
 * @param {Object} data - Data to send to endpoint
 * @returns {String} - The ID of the created collection
 */
async function createCollection (data) {
    const endpoint = POSTMAN_PUBLIC_API_URL + CREATE_COLLECTIONS_ENDPOINT + `?workspace=${data?.workspace}`;

    return new Promise((resolve, reject) => {
        request.post({
            headers: HEADERS,
            url: endpoint,
            body: JSON.stringify(data.body)
        }, function(error, response, body){
            if (error) {
                console.error('Error occurred while making request:', error);
                reject(error);
            }

            if (response.statusCode !== 200) {
                console.error('Error occurred while making request:', body);
                reject(body);
            }

            console.info('Collection created successfully!');
            resolve(body?.collection?.id);
        });
    });
}

module.exports = {
    createCollection
}