const express = require('express'),
    fs = require('fs'),
    postmanPublicAPIService = require('./postmanPublicAPIService'),
    newrelicAgent = require('./newrelicAgent'),
    postmanSdk = require('./postmanSdk'),
    { mergeOpenApiSpec } = require('./merge'),
    app = express(),
    bodyParser = require('body-parser'),
    config = require('../config.json'),
    postmanToOpenApi = require('postman-to-openapi'),
    {
        generateOpenAPISpec,
        generatePostmanCollection
    } = require('./specGenerator'),
    POSTMAN_COLLECTION = 'postman-collection',
    ROOT_FILE = {
        collection: 'assets/collection',
        schema: 'assets/schema'
    };

app.use(bodyParser.json());

// Define route to get transaction data for a given app ID
app.get('/transactions/:appId', (req, res) => {
    const appId = req.params.appId,
        type = req.query.type;

    newrelicAgent.fetchNRQLResponse({
        appId,
        apiKey: config['newrelicUserApiKey'],
        accountId: config['newrelicAccountId']
    }).then((response) => {
        const nrqlResponse = response.data?.actor?.account?.nrql?.results;

        if (type === POSTMAN_COLLECTION) {
            generatePostmanCollection(nrqlResponse, (err, collection) => {
                if (err) throw err;

                // Write collection to file
                fs.writeFile(`${ROOT_FILE['collection']}/${collection.info.name}.json`, JSON.stringify(collection, null, 4), async (err) => {
                    if (err) throw err;

                    console.info('Postman collection file saved!');
                    const data = {
                        workspace: '17435413-8f28-4c77-8c05-c85521257921',
                        body: { collection }
                    };

                    await postmanPublicAPIService.createCollection(data);
                    res.send(collection);
                });
            });
        } else {
            const openApi = generateOpenAPISpec(nrqlResponse);

            // Write OpenAPI spec to file
            fs.writeFile(`${ROOT_FILE['schema']}/${openApi.info.title}.json`, JSON.stringify(openApi, null, 4), (err) => {
                if (err) throw err;

                console.info('OpenAPI spec file saved!');
                res.send(openApi);
            });
        }


    }).catch((err) => {
        console.error(err);
        res.status(500).send('Error getting transaction data from New Relic');
    });
});


// Sync transactions from the New Relic to Postman
app.post('/sync/:apiId', (req, res) => {
    const apiId = req.params.apiId,
        collectionId = req.body.collectionId;

    let newrelicSchema,
        schemaId;

    postmanSdk.getCollection(collectionId)
        .then((collectionResponse) => {
            const collectionData = collectionResponse.collection;
            return postmanToOpenApi(JSON.stringify(collectionData), null, {outputFormat: 'json'});
        })
        .then((openApiSpec) => {
            /**
             * This is the schema generated using collection which is created with the NR transactions
             */
            newrelicSchema = JSON.parse(openApiSpec);
            return postmanSdk.getApi(apiId);
        })
        .then((api) => {
            schemaId = api.schemas[0]?.id; // todo: add safe checks
            return postmanSdk.getSchema(apiId, schemaId);
        })
        .then((data) => {
            const schemaContent = data.content,
                postmanSchema = JSON.parse(schemaContent);

            return mergeOpenApiSpec(postmanSchema, newrelicSchema);
        })
        .then((mergedSchema) => {
            // @todo: Get file name of schema before updating it
            // edge case: multi-file schema / git-linked APIs
            return postmanSdk.updateSchema(apiId, schemaId, 'index.json', mergedSchema);
        })
        .then((finalResponse) => {
            return res.send(finalResponse);
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send(err && err.toString() || 'Error while syncing endpoints from New Relic to Postman');
        });
});

app.listen(3000, () => console.log('Server running on port 3000'));
