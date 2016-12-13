'use strict'
var KeyVault = require('azure-keyvault');
var AuthenticationContext = require('adal-node').AuthenticationContext;

var clientId = process.env.KEY_VAULT_CLIENT_ID;
var clientSecret = process.env.KEY_VAULT_CLIENT_SECRET;
var vaultUri = "https://ADALTestInfo.vault.azure.net";

// Authenticator - retrieves the access token 
var authenticator = function (challenge, callback) {

    // Create a new authentication context. 
    var context = new AuthenticationContext(challenge.authorization);

    // Use the context to acquire an authentication token. 
    return context.acquireTokenWithClientCredentials(challenge.resource, clientId, clientSecret, function (err, tokenResponse) {
        if (err) throw err;
        // Calculate the value to be set in the request's Authorization header and resume the call. 
        var authorizationValue = tokenResponse.tokenType + ' ' + tokenResponse.accessToken;

        return callback(null, authorizationValue);
    });

};

var credentials = new KeyVault.KeyVaultCredentials(authenticator);
var client = new KeyVault.KeyVaultClient(credentials);

module.exports = {
   getSecret : function(secretName, callback) {
        var secretId = vaultUri + '/secrets/' +  secretName;
        console.info('Getting secret value for for secret' + secretId);
        client.getSecret(secretId, function (err, result) {
            if (err) throw err;
            callback(result);
        });
    }
};
