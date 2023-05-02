# newrelic-to-postman

An Express app to convert New Relic transactions to Open API definition or Postman collection.

## Local Development

1. Install dependencies

```
npm install
```

2. Provide New Relic's user API key in the `config.json`.

```json
{
    "newrelicAccountId": 2665918,
    "newrelicUserApiKey": "XXXXXX", // replace this with your key
    "newrelicNrqlUrl": "https://api.newrelic.com/graphql"
}
```

3. Run the following command to start the server

```
npm start
```

4. Hit `htttp://localhost:3000/transactions/:appId`. Replace `appId` with the service ID from New Relic, e.g. http://localhost:3000/transactions/1032549101

## Directory

- The collection is created under `assets/collection` folder.
- The Open API schema is created under `assets/schema` folder.

## Example service Ids

- 964198481 : version-control-service: production
- 1032549101 : publishing-service: production
- 889348647 : watch-service: production

> **NOTE:** Demo import flow with the watch service
