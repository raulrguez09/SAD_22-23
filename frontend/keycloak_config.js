var Keycloak = require('keycloak-connect')

let _keycloak

var keycloakConfig = {
    clientId: process.env.KEYCLOAK_CLIENTID,
    bearerOnly: true,
    serverUrl: process.env.KEYCLOAK_BROKER,
    realm: process.env.KEYCLOAK_REALM,
    realmPublicKey: process.env.KEYCLOAK_SECRET_KEY
}

function initKeycloak(memoryStore) {
    if (_keycloak) {
        console.warn("Trying to init Keycloak again!");
        return _keycloak;
    } 
    else {
        console.log("Initializing Keycloak...");
        _keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);
        return _keycloak;
    }
}

function getKeycloak() {
    if (!_keycloak){
        console.error('Keycloak has not been initialized. Please called init first.');
    } 
    return _keycloak;
}

module.exports = {
    initKeycloak,
    getKeycloak,
    keycloakConfig
};