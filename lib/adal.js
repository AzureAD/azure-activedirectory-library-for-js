//----------------------------------------------------------------------
// AdalJS-Experimental v2.0.0-experimental
// @preserve Copyright (c) Microsoft Open Technologies, Inc.
// All Rights Reserved
// Apache License 2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//----------------------------------------------------------------------
'use strict';

// node.js usage for tests
var Logging = {
    log: function () { },
};

var AuthenticationContext;
if (typeof module !== 'undefined' && module.exports) {
    module.exports.inject = function (conf) {
        return new AuthenticationContext(conf);
    };
}

/**
 * Config information
 * @public
 * @class Config
 * @property {tenant}          Your target tenant
 * @property {clientId}        Identifier assigned to your app by Azure Active Directory
 * @property {redirectUri}     Endpoint at which you expect to receive tokens
 * @property {instance}        Azure Active Directory Instance(default:https://login.microsoftonline.com/)
 * @property {endpoints}       Collection of {Endpoint-ResourceId} used for autmatically attaching tokens in webApi calls
 */

/**
* User information from idtoken.
*  @class User
*  @property {string} userName - username assigned from upn or email.
*  @property {object} profile - properties parsed from idtoken.
*/

/**
 * Creates a new AuthenticationContext object.
 * @constructor
 * @param {object}  config               Configuration options for AuthenticationContext
 *
 **/
AuthenticationContext = function (config) {
    /**
    * Enum for request type
    * @enum {string}
    */
    this.REQUEST_TYPE = {
        LOGIN: 'LOGIN',
        RENEW_TOKEN: 'RENEW_TOKEN',
        ID_TOKEN: 'ID_TOKEN',
        UNKNOWN: 'UNKNOWN'
    };
    
    /**
    * Enum for storage constants
    * @enum {string}
    */
    this.CONSTANTS = {
        ACCESS_TOKEN: 'access_token',
        EXPIRES_IN: 'expires_in',
        ID_TOKEN: 'id_token',
        ERROR_DESCRIPTION: 'error_description',
        SESSION_STATE: 'session_state',
        SCOPE: 'scope',
        STORAGE: {
            TOKEN_KEYS: 'adal.token.keys',
            ACCESS_TOKEN_KEY: 'adal.access.token.key',
            EXPIRATION_KEY: 'adal.expiration.key',
            START_PAGE: 'adal.start.page',
            FAILED_RENEW: 'adal.failed.renew',
            STATE_LOGIN: 'adal.state.login',
            STATE_RENEW: 'adal.state.renew',
            STATE_RENEW_RESOURCE: 'adal.state.renew.resource',
            STATE_IDTOKEN: 'adal.state.idtoken',
            NONCE_IDTOKEN: 'adal.nonce.idtoken',
            SESSION_STATE: 'adal.session.state',
            USERNAME: 'adal.username',
            IDTOKEN: 'adal.idtoken',
            ERROR: 'adal.error',
            ERROR_DESCRIPTION: 'adal.error.description',
            LOGIN_REQUEST: 'adal.login.request',
            LOGIN_ERROR: 'adal.login.error',
            POLICY: 'adal.token.policy'
        },
        PARAMETERS: {
            CLIENT_ID: 'client_id',
            USERNAME: 'username',
            SCOPE: 'scope',
            AUTHORITY: 'authority',
            POLICY: 'policy',
            RESPONSE_TYPE: 'response_type',
            EXPIRE: 'expire',
            TOKEN: 'token'
        },
        SCOPE_DELIMETER: ' ',
        RESOURCE_DELIMETER: '|',
        ERR_MESSAGES: {
            NO_TOKEN: 'User is not authorized'
        }, 
        MSA_TENANTID: '9188040d-6c67-4c5b-b112-36a304b66dad'
    };
    
    if (AuthenticationContext.prototype._singletonInstance) {
        return AuthenticationContext.prototype._singletonInstance;
    }
    AuthenticationContext.prototype._singletonInstance = this;
    
    // public
    this.instance = 'https://login.microsoftonline.com/';
    this.config = {};
    this.callback = null;
    this.popUp = false;
    
    // private
    this._user = null;
    this._renewActive = false;
    this._loginInProgress = false;
    this._renewStates = [];
    window.callBackMappedToRenewStates = {};
    
    //this._policy = null;
    window.policy = null;
    
    // validate before constructor assignments
    if (config.displayCall && typeof config.displayCall !== 'function') {
        throw new Error('displayCall is not a function');
    }
    
    if (!config.clientId) {
        throw new Error('clientId is required');
    }
    
    if (!config.scope || config.scope === 'undefined') {
        config.scope = [];
    }
    
    if (!config.correlationId) {
        config.correlationId = this._guid();
    }
    
    this.config = this._cloneConfig(config);
    
    // TODO: currently remove login resource, need to think. 
    // App can request idtoken for itself using clientid as resource
    
    if (!this.config.redirectUri) {
        this.config.redirectUri = window.location.href;
    }
    
    this._validateInputScope(this.config.scope);
};

/**
 * Gets initial Idtoken for the app backend
 * Saves the resulting Idtoken in localStorage.
 * By default, login will gain consent for all the scopes defined in config. 
 * @param {array} aditionalScope An arrayof aditional scopes to be consented for in the interactive login. 
 */
AuthenticationContext.prototype.login = function (additionalScope) {
    var scope = [];
    // Token is not present and user needs to login
    if (this._isEmpty(additionalScope)) {
        scope = this.config.scope;
    }
    else {
        scope = this.config.scopes.concat(additionalScope);
        this._validateInputScope(scope);
    }
    
    var expectedState = this._guid();
    this.config.state = expectedState;
    this._idTokenNonce = this._guid();
    this._logstatus('Expected state: ' + expectedState + ' startPage:' + window.location);
    this._saveItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST, window.location);
    this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, '');
    this._saveItem(this.CONSTANTS.STORAGE.STATE_LOGIN, expectedState);
    this._saveItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN, this._idTokenNonce);
    this._saveItem(this.CONSTANTS.STORAGE.FAILED_RENEW, '');
    this._saveItem(this.CONSTANTS.STORAGE.ERROR, '');
    this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');
    
    
    var urlNavigate = this._getNavigateUrl('id_token', scope) + '&nonce=' + encodeURIComponent(this._idTokenNonce);
    this.frameCallInProgress = false;
    this._loginInProgress = true;
    if (this.config.displayCall) {
        // User defined way of handling the navigation
        this.config.displayCall(urlNavigate);
    } else {
        this.promptUser(urlNavigate);
    }
    // callback from redirected page will receive fragment. It needs to call oauth2Callback
};

AuthenticationContext.prototype.loginInProgress = function () {
    return this._loginInProgress;
};

//this.CONSTANTS.STORAGE.TOKEN_KEYS stores a list of entries
AuthenticationContext.prototype._hasEntry = function (entry) {
    var keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS);
    return keys && !this._isEmpty(keys) && (JSON.parse(keys).indexOf(entry) > -1);
};

AuthenticationContext.prototype._getPotentialEntries = function (entryKey) {
    var potentialEntries = [];
    
    var key = JSON.parse(entryKey);
    var storedEntryKeys = JSON.parse(this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS));
    
    if (this._isEmpty(storedEntryKeys)) {
        return potentialEntries;
    }
    
    for (var index = 0; index < storedEntryKeys.length; ++index) {
        var storedEntryKey = JSON.parse(storedEntryKeys[index]);
        if (this._contains(key, storedEntryKey)) {
            potentialEntries.push(storedEntryKey);
        }
    }
    
    return potentialEntries;
};

AuthenticationContext.prototype._contains = function (targetedEntryKey, storedKey) {
    for (var key in targetedEntryKey) {
        if (targetedEntryKey.hasOwnProperty(key)) {
            if (!(storedKey.hasOwnProperty(key) && storedKey[key] === targetedEntryKey[key])) {
                return false;
            }
        }
    }
    
    return true;
};

AuthenticationContext.prototype.getCachedToken = function (scopes) {
    this._validateInputScope(scopes);

    var targetEntryKey;
    var potentialEntries = [];
    
    // For get cachedtoken, if it's for id token
    if (this._isEmpty(scopes) || (scopes.indexOf(this.config.clientId) > -1)) {
        targetEntryKey = this._createTokenCacheEntryKeyForIDToken();
        potentialEntries = this._getPotentialEntries(targetEntryKey);
    }
    else {
        targetEntryKey = this._createTokenCacheEntryKey();
        var matchedEntries = this._getPotentialEntries(targetEntryKey);
        for (var i = 0; i < matchedEntries.length; ++i) {
            var potentialEntryValue = JSON.parse(this._getItem(JSON.stringify(matchedEntries[i])));
            if (potentialEntryValue && potentialEntryValue.hasOwnProperty(this.CONSTANTS.PARAMETERS.SCOPE) && this._scopeContains(potentialEntryValue[this.CONSTANTS.PARAMETERS.SCOPE], scopes)) {
                potentialEntries.push(matchedEntries[i]);
            }
        }
    }
    
    if (0 === potentialEntries.length) {
        return null;
    }
    else if (potentialEntries.length > 1) {
        Logging.log('scopes: ' + scopes);
        throw new Error("Multiple entries found!");
    }
    else {
        var entryKey = JSON.stringify(potentialEntries[0]);
        var valueInCache = JSON.parse(this._getItem(entryKey));
        if (valueInCache) {
            var token = valueInCache[this.CONSTANTS.PARAMETERS.TOKEN];
            var expired = valueInCache[this.CONSTANTS.PARAMETERS.EXPIRE];
            
            // If expiration is within offset, it will force renew
            var offset = this.config.expireOffsetSeconds || 120;
            
            if (expired && (expired > this._now() + offset)) {
                return token;
            } else {
                //this._removeItem(entryKey);
                this._saveItem(entryKey, JSON.stringify({}));
                return null;
            }
        }
    }
    
    return null;
};

/**
* Retrieves and parse idToken from localstorage
* @returns {User} user object
*/
AuthenticationContext.prototype.getCachedUser = function () {
    if (this._user) {
        return this._user;
    }
    
    var idtoken = this._getItem(this.CONSTANTS.STORAGE.IDTOKEN);
    this._user = this._createUser(idtoken);
    return this._user;
};

// var errorResponse = {error:'', errorDescription:''};
// var token = 'string token';
// callback(errorResponse, token)
// with callback
/**
* Acquires access token with hidden iframe
* @param   {array}  scopes An array of scopes that the access token is acquired for. 
* @returns {string} access token if request is successfull
*/
AuthenticationContext.prototype._renewToken = function (scopes, callback) {
    // use iframe to try refresh token
    // use given resource to create new authz url
    var parsedScopes = this._parseScope(scopes);
    this._logstatus('renewToken is called for scopes: ' + this._parseScope(scopes));
    
    if (!this._hasEntry(this._createTokenCacheEntryKey())) {
        var keys = JSON.parse(this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS)) || [];
        keys.push(this._createTokenCacheEntryKey());
        this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, JSON.stringify(keys));
    }
    
    var frameHandle = this._addAdalFrame('adalRenewFrame' + parsedScopes);
    var expectedState = this._guid() + '|' + parsedScopes;
    this._idTokenNonce = this._guid();
    this.config.state = expectedState;
    // renew happens in iframe, so it keeps javascript context
    this._renewStates.push(expectedState);
    
    this._saveItem(this.CONSTANTS.STORAGE.FAILED_RENEW, '');
    
    this._logstatus('Renew token Expected state: ' + expectedState);
    
    var urlNavigate = this._getNavigateUrl('token', scopes) + '&prompt=none&login_hint=' + encodeURIComponent(this._user.userName);
    urlNavigate += '&domain_hint=' + encodeURIComponent(this._user.domainHint);
    urlNavigate += '&nonce=' + encodeURIComponent(this._idTokenNonce);
    this.callback = callback;
    window.callBackMappedToRenewStates[expectedState] = callback;
    this.idTokenNonce = null;
    this._logstatus('Navigate to:' + urlNavigate);
    this.log(parsedScopes, 'Navigate to:' + urlNavigate);
    this._saveItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST, '');
    
    frameHandle.src = 'about:blank';
    this._loadFrame(urlNavigate, 'adalRenewFrame' + parsedScopes);
};

AuthenticationContext.prototype._renewIdToken = function (scopes, callback) {
    // use iframe to try refresh token
    this._logstatus('renewIdToken is called');
    
    if (!this._hasEntry(this._createTokenCacheEntryKeyForIDToken())) {
        var keys = JSON.parse(this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS)) || [];
        keys.push(this._createTokenCacheEntryKeyForIDToken());
        this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, JSON.stringify(keys));
    }
    
    var frameHandle = this._addAdalFrame('adalIdTokenFrame');
    var expectedState = this._guid() + '|' + this.config.clientId;
    this._idTokenNonce = this._guid();
    this._saveItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN, this._idTokenNonce);
    this.config.state = expectedState;
    // renew happens in iframe, so it keeps javascript context
    this._renewStates.push(expectedState);
    this._saveItem(this.CONSTANTS.STORAGE.STATE_RENEW, expectedState);
    this._saveItem(this.CONSTANTS.STORAGE.FAILED_RENEW, '');
    
    this._logstatus('Renew token Expected state: ' + expectedState);
    
    var urlNavigate = this._getNavigateUrl('id_token', scopes) + '&prompt=none&login_hint=' + encodeURIComponent(this._user.userName);
    urlNavigate += '&domain_hint=' + encodeURIComponent(this._user.domainHint);
    urlNavigate += '&nonce=' + encodeURIComponent(this._idTokenNonce);
    this.callback = callback;
    this.idTokenNonce = null;
    this._logstatus('Navigate to:' + urlNavigate);
    this._saveItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST, '');
    
    frameHandle.src = 'about:blank';
    this._loadFrame(urlNavigate, 'adalIdTokenFrame');
};

AuthenticationContext.prototype._loadFrame = function (urlNavigate, frameName) {
    // This trick overcomes iframe navigation in IE
    // IE does not load the page consistently in iframe
    var self = this;
    self._logstatus('LoadFrame: ' + frameName);
    var frameCheck = frameName;
    setTimeout(function () {
        var frameHandle = self._addAdalFrame(frameCheck);
        if (frameHandle.src === '' || frameHandle.src === 'about:blank') {
            frameHandle.src = urlNavigate;
            self._loadFrame(urlNavigate, frameCheck);
        }
    }, 500);
};

/**
* Acquire token from cache if not expired and available. Acquires token from iframe if expired.
* @param {array}   scopes  An array of scopes that the token is acquired for. 
* @param {requestCallback} callback 
* @note scopes for this method is already consented. 
*/
AuthenticationContext.prototype.acquireTokenSilent = function (scopes, callback) {
    scopes = scopes || this.config.scope;
    this._validateInputScope(scopes);
    
    var token;
    try {
        token = this.getCachedToken(scopes);
    }
    catch (e) {
        callback(e, null);
    }
    
    if (token) {
        this._logstatus('Token in cache');
        callback(null, token);
        return;
    }
    
    if (this._getItem(this.CONSTANTS.STORAGE.FAILED_RENEW)) {
        this._logstatus('renewToken is failed:' + this._getItem(this.CONSTANTS.STORAGE.FAILED_RENEW));
        callback(this._getItem(this.CONSTANTS.STORAGE.FAILED_RENEW), null);
        return;
    }
    
    if (!this._user) {
        callback('User login is required', null);
        return;
    }
    
    // refresh attept with iframe
    this._renewActive = true;
    if (this._isEmpty(scopes) || (scopes.indexOf(this.config.clientId) > -1)) {
        // App uses idtoken to send to api endpoints
        // Default resource is tracked as clientid to store this token
        this._logstatus('renewing idtoken');
        this._renewIdToken(scopes, callback);
    } else {
        this._logstatus('renewing accesstoken');
        this._renewToken(scopes, callback);
    }
};

/**
* Redirect the Browser to Azure AD Authorization endpoint
* @param {string}   urlNavigate The authorization request url
*/
AuthenticationContext.prototype.promptUser = function (urlNavigate) {
    if (urlNavigate) {
        this._logstatus('Navigate to:' + urlNavigate);
        window.location.replace(urlNavigate);
    } else {
        this._logstatus('Navigate url is empty');
    }
};

/**
* Clear cache items.
*/
AuthenticationContext.prototype.clearCache = function () {
    this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY, '');
    this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY, 0);
    this._saveItem(this.CONSTANTS.STORAGE.FAILED_RENEW, '');
    this._saveItem(this.CONSTANTS.STORAGE.SESSION_STATE, '');
    this._saveItem(this.CONSTANTS.STORAGE.STATE_LOGIN, '');
    this._renewStates = [];
    this._saveItem(this.CONSTANTS.STORAGE.STATE_IDTOKEN, '');
    this._saveItem(this.CONSTANTS.STORAGE.START_PAGE, '');
    this._saveItem(this.CONSTANTS.STORAGE.USERNAME, '');
    this._saveItem(this.CONSTANTS.STORAGE.IDTOKEN, '');
    this._saveItem(this.CONSTANTS.STORAGE.ERROR, '');
    this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');
    
    var entryKeys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS);
    var keys = !entryKeys ? {} : JSON.parse(entryKeys);
    
    if (!this._isEmpty(keys)) {
        for (var i = 0; i < keys.length; i++) {
            this._saveItem(keys[i], JSON.stringify({}));
        }
    }
    this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, JSON.stringify([]));
};

AuthenticationContext.prototype.clearCacheForStoredEntry = function (scopes) {
    this._saveItem(this.CONSTANTS.STORAGE.FAILED_RENEW, '');
    this._saveItem(this.CONSTANTS.STORAGE.STATE_RENEW, '');
    this._saveItem(this.CONSTANTS.STORAGE.STATE_IDTOKEN, '');
    this._saveItem(this.CONSTANTS.STORAGE.ERROR, '');
    this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');
    
    var entryKeyToBeRemoved;
    if (scopes === this.config.clientId || scopes && scopes.indexOf(this.config.clientId) > -1) {
        entryKeyToBeRemoved = this._createTokenCacheEntryKeyForIDToken();
        //If policy is empty, should remove all the entries that match authority, clientid or username. 
    }
    else {
        entryKeyToBeRemoved = this._createTokenCacheEntryKey();
    }
    
    var entriesToBeRemoved = this._getPotentialEntries(entryKeyToBeRemoved);
        
    for (var i = 0; i < entriesToBeRemoved.length; i++) {
        this._saveItem(JSON.stringify(entriesToBeRemoved[i]), JSON.stringify({}));
    }
};

/**
* Logout user will redirect page to logout endpoint. 
* After logout, it will redirect to post_logout page if provided.
*/
AuthenticationContext.prototype.logOut = function () {
    this.clearCache();
    var tenant = 'common';
    var logout = '';
    this._user = null;
    if (this.config.tenant) {
        tenant = this.config.tenant;
    }
    
    if (this.config.instance) {
        this.instance = this.config.instance;
    }
    
    if (this.config.postLogoutRedirectUri) {
        logout = 'post_logout_redirect_uri=' + encodeURIComponent(this.config.postLogoutRedirectUri);
    }
    
    var urlNavigate = this.instance + tenant + '/oauth2/logout?' + logout;
    this._logstatus('Logout navigate to: ' + urlNavigate);
    this.promptUser(urlNavigate);
};

AuthenticationContext.prototype._isEmpty = function (str) {
    return (typeof str === 'undefined' || !str || 0 === str.length);
};

/**
 * This callback is displayed as part of the Requester class.
 * @callback requestCallback
 * @param {string} error
 * @param {User} user
 */

/**
 * Gets a user profile
 * @param {requestCallback} cb - The callback that handles the response.
 */
AuthenticationContext.prototype.getUser = function (callback) {
    // IDToken is first call
    if (typeof callback !== 'function') {
        throw new Error('callback is not a function');
    }
    
    this.callback = callback;
    
    // user in memory
    if (this._user) {
        this.callback(null, this._user);
        return;
    }
    
    // frame is used to get idtoken
    var idtoken = this._getItem(this.CONSTANTS.STORAGE.IDTOKEN);
    if (!this._isEmpty(idtoken)) {
        this._logstatus('User exists in cache: ');
        this._user = this._createUser(idtoken);
        this.callback(null, this._user);
    } else {
        this.callback('User information is not available');
    }
};

AuthenticationContext.prototype._createUser = function (idToken) {
    var user = null;
    var parsedJson = this._extractIdToken(idToken);
    if (parsedJson && parsedJson.hasOwnProperty('aud')) {
        
        if (parsedJson.aud.toLowerCase() === this.config.clientId.toLowerCase()) {
            
            user = {
                userName: '',
                domainHint: '',
                profile: parsedJson
            };
            
            if (parsedJson.hasOwnProperty('preferred_username')) {
                user.userName = parsedJson.preferred_username;
            }
            
            if (parsedJson.hasOwnProperty('tid')) {
                if (parsedJson.tid === this.CONSTANTS.MSA_TENANTID) {
                    user.domainHint = 'consumers';
                }
                else {
                    user.domainHint = 'organizations';
                }
            }
        } else {
            this._logstatus('IdToken has invalid aud field');
        }

    }
    
    return user;
};

AuthenticationContext.prototype._getHash = function (hash) {
    if (hash.indexOf('#/') > -1) {
        hash = hash.substring(hash.indexOf('#/') + 2);
    } else if (hash.indexOf('#') > -1) {
        hash = hash.substring(1);
    }
    
    return hash;
};

/**
 * Checks if hash contains access token or id token or error_description
 * @param {string} hash  -  Hash passed from redirect page
 * @returns {Boolean}
 */
AuthenticationContext.prototype.isCallback = function (hash) {
    hash = this._getHash(hash);
    var parameters = this._deserialize(hash);
    return (
            parameters.hasOwnProperty(this.CONSTANTS.ERROR_DESCRIPTION) ||
            parameters.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN) ||
            parameters.hasOwnProperty(this.CONSTANTS.ID_TOKEN)
);
};

/**
 * Gets login error
 * @returns {string} error message related to login
 */
AuthenticationContext.prototype.getLoginError = function () {
    return this._getItem(this.CONSTANTS.STORAGE.LOGIN_ERROR);
};

/**
 * Gets requestInfo from given hash.
 * @returns {string} error message related to login
 */
AuthenticationContext.prototype.getRequestInfo = function (hash) {
    hash = this._getHash(hash);
    var parameters = this._deserialize(hash);
    var requestInfo = { valid: false, parameters: {}, stateMatch: false, stateResponse: '', requestType: this.REQUEST_TYPE.UNKNOWN };
    if (parameters) {
        requestInfo.parameters = parameters;
        if (parameters.hasOwnProperty(this.CONSTANTS.ERROR_DESCRIPTION) ||
            parameters.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN) ||
            parameters.hasOwnProperty(this.CONSTANTS.ID_TOKEN)) {
            
            requestInfo.valid = true;
            
            // which call
            var stateResponse = '';
            if (parameters.hasOwnProperty('state')) {
                this._logstatus('State: ' + parameters.state);
                stateResponse = parameters.state;
            } else {
                this._logstatus('No state returned');
            }
            
            requestInfo.stateResponse = stateResponse;
            
            // async calls can fire iframe and login request at the same time if developer does not use the API as expected
            // incoming callback needs to be looked up to find the request type
            switch (stateResponse) {
                case this._getItem(this.CONSTANTS.STORAGE.STATE_LOGIN):
                    requestInfo.requestType = this.REQUEST_TYPE.LOGIN;
                    requestInfo.stateMatch = true;
                    break;

                case this._getItem(this.CONSTANTS.STORAGE.STATE_IDTOKEN):
                    requestInfo.requestType = this.REQUEST_TYPE.ID_TOKEN;
                    this._saveItem(this.CONSTANTS.STORAGE.STATE_IDTOKEN, '');
                    requestInfo.stateMatch = true;
                    break;
            }
            
            // external api requests may have many renewtoken requests for different resource          
            if (!requestInfo.stateMatch && window.parent && window.parent.AuthenticationContext()) {
                var statesInParentContext = window.parent.AuthenticationContext()._renewStates;
                for (var i = 0; i < statesInParentContext.length; i++) {
                    if (statesInParentContext[i] === requestInfo.stateResponse) {
                        requestInfo.requestType = this.REQUEST_TYPE.RENEW_TOKEN;
                        requestInfo.stateMatch = true;
                        break;
                    }
                }
            }
        }
    }
    
    return requestInfo;
};

AuthenticationContext.prototype._getScopesFromState = function (state) {
    if (state) {
        var splitIndex = state.indexOf('|');
        if (splitIndex > -1 && splitIndex + 1 < state.length) {
            return state.substring(splitIndex + 1);
        }
    }
    
    return '';
};

/**
 * Saves token from hash that is received from redirect.
 * @param {string} hash  -  Hash passed from redirect page
 * @returns {string} error message related to login
 */
AuthenticationContext.prototype.saveTokenFromHash = function (requestInfo) {
    this._logstatus('State status:' + requestInfo.stateMatch);
    this._logstatus('Request type' + requestInfo.requestType);
    this._saveItem(this.CONSTANTS.STORAGE.ERROR, '');
    this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');
    
    // Record error
    if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ERROR_DESCRIPTION)) {
        this._logstatus('Error :' + requestInfo.parameters.error);
        this._logstatus('Error description:' + requestInfo.parameters[this.CONSTANTS.ERROR_DESCRIPTION]);
        this._saveItem(this.CONSTANTS.STORAGE.FAILED_RENEW, requestInfo.parameters[this.CONSTANTS.ERROR_DESCRIPTION]);
        this._saveItem(this.CONSTANTS.STORAGE.ERROR, requestInfo.parameters.error);
        this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, requestInfo.parameters[this.CONSTANTS.ERROR_DESCRIPTION]);
        
        if (requestInfo.requestType === this.REQUEST_TYPE.LOGIN) {
            this._loginInProgress = false;
            this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, requestInfo.parameters.errorDescription);
        } else {
            this._renewActive = false;
        }
    } else {
        
        // It must verify the state from redirect
        if (requestInfo.stateMatch) {
            // record tokens to storage if exists
            this._logstatus('State is right');
            if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.SESSION_STATE)) {
                this._saveItem(this.CONSTANTS.STORAGE.SESSION_STATE, requestInfo.parameters[this.CONSTANTS.SESSION_STATE]);
            }
            
            if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN)) {
                this._logstatus('Fragment has access token');
                this._renewActive = false;
                
                var entryKey = this._createTokenCacheEntryKey();
                var entryValue = this._createTokenCacheEntryValue(requestInfo);
                
                this._saveTokenIntoCache(entryKey, entryValue);
            }
            
            if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ID_TOKEN)) {
                this._loginInProgress = false;
                this._user = this._createUser(requestInfo.parameters[this.CONSTANTS.ID_TOKEN]);
                if (this._user && this._user.profile) {
                    if (this._user.profile.nonce !== this._getItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN)) {
                        this._user = null;
                        this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, 'Nonce is not same as ' + this._idTokenNonce);
                    } else {
                        this._saveItem(this.CONSTANTS.STORAGE.IDTOKEN, requestInfo.parameters[this.CONSTANTS.ID_TOKEN]);
                        var entryKey = this._createTokenCacheEntryKeyForIDToken();
                        var entryValue = this._createTokenCacheEntryValue(requestInfo);
                        
                        this._saveTokenIntoCache(entryKey, entryValue);
                    }
                }
            }
        } else {
            this._saveItem(this.CONSTANTS.STORAGE.ERROR, 'Invalid_state');
            this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, 'Invalid_state');
            if (requestInfo.requestType === this.REQUEST_TYPE.LOGIN) {
                this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, 'State is not same as ' + requestInfo.stateResponse);
            }
        }
    }
};

AuthenticationContext.prototype._saveTokenIntoCache = function (entryKey, entryValue) {
    if (!this._hasEntry(entryKey)) {
        var keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS) ? JSON.parse(this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS)) : [];
        keys.push(entryKey);
        this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, JSON.stringify(keys));
    }
    this._saveItem(entryKey, entryValue);
};

/**
 * Extract the scopes for givien endpoint. 
 * @param {Hash} endpoint  -  The endpoint that are requested for scopes. 
 * @returns {array} List of scopes for the endpoint. 
 */
AuthenticationContext.prototype.getScopesForEndpoint = function (endpoint) {
    if (this.config && this.config.endpoints) {
        for (var configEndpoint in this.config.endpoints) {
            // configEndpoint is like /api/Todo requested endpoint can be /api/Todo/1
            if (endpoint.indexOf(configEndpoint) > -1) {
                var endpointEntry = this.config.endpoints[configEndpoint];
                if (endpointEntry && endpointEntry.hasOwnProperty('scope')) {
                    return endpointEntry['scope'];
                }
            }
        }
    }
    
    // default resource will be clientid if nothing specified
    // App will use idtoken for calls to itself
    return [this.config.clientId];
};

/*exported  oauth2Callback */
AuthenticationContext.prototype.handleWindowCallback = function () {
    // This is for regular javascript usage for redirect handling
    // need to make sure this is for callback
    var hash = window.location.hash;
    if (this.isCallback(hash)) {
        var requestInfo = this.getRequestInfo(hash);
        this.log(this._getScopesFromState(requestInfo.stateResponse), 'returned from redirect url');
        this.saveTokenFromHash(requestInfo);
        var callback = null;
        if ((requestInfo.requestType === this.REQUEST_TYPE.RENEW_TOKEN ||
            requestInfo.requestType === this.REQUEST_TYPE.ID_TOKEN) &&
            window.parent) {
            // iframe call but same single page
            this._logstatus('Window is in iframe');
            callback = window.parent.callBackMappedToRenewStates[requestInfo.stateResponse];
            window.src = '';
        } else if (window && window.oauth2Callback) {
            this._logstatus('Window is redirecting');
            callback = this.callback;
        }
        
        window.location.hash = '';
        window.location = this._getItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST);
        if (requestInfo.requestType === this.REQUEST_TYPE.RENEW_TOKEN) {
            callback(this._getItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters[this.CONSTANTS.ACCESS_TOKEN] || requestInfo.parameters[this.CONSTANTS.ID_TOKEN]);
            return;
        } else if (requestInfo.requestType === this.REQUEST_TYPE.ID_TOKEN) {
            // JS context may not have the user if callback page was different, so parse idtoken again to callback
            callback(this._getItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION), this._createUser(this._getItem(this.CONSTANTS.STORAGE.IDTOKEN)));
            return;
        }
    }
};

AuthenticationContext.prototype._getNavigateUrl = function (responseType, scopes) {
    var tenant = 'common';
    if (this.config.tenant) {
        tenant = this.config.tenant;
    }
    
    if (this.config.instance) {
        this.instance = this.config.instance;
    }
    
    if (responseType === 'id_token') {
        if (scopes.indexOf(this.config.clientId) > -1) {
            this._translateClientIdUsedInScope(scopes);
        }

        else if (scopes.indexOf('openid') === -1) {
            scopes.push('openid');
        }
    }
    
    var urlNavigate = this.instance + tenant + '/oauth2/v2.0/authorize' + this._serialize(responseType, this.config, scopes) + this._addClientId();
    this._logstatus('Navigate url:' + urlNavigate);
    return urlNavigate;
};

AuthenticationContext.prototype._extractIdToken = function (encodedIdToken) {
    // id token will be decoded to get the username
    var decodedToken = this._decodeJwt(encodedIdToken);
    if (!decodedToken) {
        return null;
    }
    
    try {
        var base64IdToken = decodedToken.JWSPayload;
        var base64Decoded = this._base64DecodeStringUrlSafe(base64IdToken);
        if (!base64Decoded) {
            this._logstatus('The returned id_token could not be base64 url safe decoded.');
            return null;
        }
        
        // ECMA script has JSON built-in support
        return JSON.parse(base64Decoded);
    } catch (err) {
        this._logstatus('The returned id_token could not be decoded: ' + err.stack);
    }
    
    return null;
};

AuthenticationContext.prototype._extractUserName = function (encodedIdToken) {
    // id token will be decoded to get the username
    try {
        var parsed = this._extractIdToken(encodedIdToken);
        if (parsed) {
            if (parsed.hasOwnProperty('upn')) {
                return parsed.upn;
            } else if (parsed.hasOwnProperty('email')) {
                return parsed.email;
            }
        }
    } catch (err) {
        this._logstatus('The returned id_token could not be decoded: ' + err.stack);
    }
    
    return null;
};

AuthenticationContext.prototype._base64DecodeStringUrlSafe = function (base64IdToken) {
    // html5 should support atob function for decoding
    base64IdToken = base64IdToken.replace(/-/g, '+').replace(/_/g, '/');
    if (window.atob) {
        return decodeURIComponent(escape(window.atob(base64IdToken))); // jshint ignore:line
    }
    
    // TODO add support for this
    this._logstatus('Browser is not supported');
    return null;
};

// Adal.node js crack function
AuthenticationContext.prototype._decodeJwt = function (jwtToken) {
    var idTokenPartsRegex = /^([^\.\s]*)\.([^\.\s]+)\.([^\.\s]*)$/;
    
    var matches = idTokenPartsRegex.exec(jwtToken);
    if (!matches || matches.length < 4) {
        this._logstatus('The returned id_token is not parseable.');
        return null;
    }
    
    var crackedToken = {
        header: matches[1],
        JWSPayload: matches[2],
        JWSSig: matches[3]
    };
    
    return crackedToken;
};

AuthenticationContext.prototype._convertUrlSafeToRegularBase64EncodedString = function (str) {
    return str.replace('-', '+').replace('_', '/');
};

AuthenticationContext.prototype._serialize = function (responseType, obj, scopes) {
    var str = [];
    if (obj !== null) {
        str.push('?response_type=' + responseType);
        str.push('client_id=' + encodeURIComponent(obj.clientId));
        
        str.push('scope=' + encodeURIComponent(this._parseScope(scopes)));
        
        str.push('redirect_uri=' + encodeURIComponent(obj.redirectUri));
        str.push('state=' + encodeURIComponent(obj.state));
        
        if (obj.hasOwnProperty('extraQueryParameter')) {
            str.push(obj.extraQueryParameter);
        }
        
        if (obj.correlationId) {
            str.push('client-request-id=' + encodeURIComponent(obj.correlationId));
        }
    }
    
    return str.join('&');
};

AuthenticationContext.prototype._deserialize = function (query) {
    var match,
        pl = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, ' ')); },
        obj = {};
    match = search.exec(query);
    while (match) {
        obj[decode(match[1])] = decode(match[2]);
        match = search.exec(query);
    }
    
    return obj;
};

/* jshint ignore:start */
AuthenticationContext.prototype._guid = function () {
    // RFC4122: The version 4 UUID is meant for generating UUIDs from truly-random or
    // pseudo-random numbers.
    // The algorithm is as follows:
    //     Set the two most significant bits (bits 6 and 7) of the
    //        clock_seq_hi_and_reserved to zero and one, respectively.
    //     Set the four most significant bits (bits 12 through 15) of the
    //        time_hi_and_version field to the 4-bit version number from
    //        Section 4.1.3. Version4 
    //     Set all the other bits to randomly (or pseudo-randomly) chosen
    //     values.
    // UUID                   = time-low "-" time-mid "-"time-high-and-version "-"clock-seq-reserved and low(2hexOctet)"-" node
    // time-low               = 4hexOctet
    // time-mid               = 2hexOctet
    // time-high-and-version  = 2hexOctet
    // clock-seq-and-reserved = hexOctet: 
    // clock-seq-low          = hexOctet
    // node                   = 6hexOctet
    // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // y could be 1000, 1001, 1010, 1011 since most significant two bits needs to be 10
    // y values are 8, 9, A, B
    var guidHolder = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    var hex = '0123456789abcdef';
    var r = 0;
    var guidResponse = "";
    for (var i = 0; i < 36; i++) {
        if (guidHolder[i] !== '-' && guidHolder[i] !== '4') {
            // each x and y needs to be random
            r = Math.random() * 16 | 0;
        }
        
        if (guidHolder[i] === 'x') {
            guidResponse += hex[r];
        } else if (guidHolder[i] === 'y') {
            // clock-seq-and-reserved first hex is filtered and remaining hex values are random
            r &= 0x3; // bit and with 0011 to set pos 2 to zero ?0??
            r |= 0x8; // set pos 3 to 1 as 1???
            guidResponse += hex[r];
        } else {
            guidResponse += guidHolder[i];
        }
    }
    
    return guidResponse;
};
/* jshint ignore:end */

AuthenticationContext.prototype._expiresIn = function (expires) {
    return this._now() + parseInt(expires, 10);
};

AuthenticationContext.prototype._now = function () {
    return Math.round(new Date().getTime() / 1000.0);
};


AuthenticationContext.prototype._addAdalFrame = function (iframeId) {
    if (typeof iframeId === 'undefined') {
        return;
    }
    
    this._logstatus('Add adal frame to document:' + iframeId);
    var adalFrame = document.getElementById(iframeId);
    
    if (!adalFrame) {
        if (document.createElement && document.documentElement &&
            (window.opera || window.navigator.userAgent.indexOf('MSIE 5.0') === -1)) {
            var ifr = document.createElement('iframe');
            ifr.setAttribute('id', iframeId);
            ifr.style.visibility = 'hidden';
            ifr.style.position = 'absolute';
            ifr.style.width = ifr.style.height = ifr.borderWidth = '0px';
            
            adalFrame = document.getElementsByTagName('body')[0].appendChild(ifr);
        }
        else if (document.body && document.body.insertAdjacentHTML) {
            document.body.insertAdjacentHTML('beforeEnd', '<iframe name="' + iframeId + '" id="' + iframeId + '" style="display:none"></iframe>');
        }
        if (window.frames && window.frames[iframeId]) {
            adalFrame = window.frames[iframeId];
        }
    }
    
    return adalFrame;
};

AuthenticationContext.prototype._logstatus = function (msg) {
    if (console) {
        console.log(msg);
    }
};

AuthenticationContext.prototype._saveItem = function (key, obj) {
    
    if (this.config && this.config.cacheLocation && this.config.cacheLocation === 'localStorage') {
        
        if (!this._supportsLocalStorage()) {
            this._logStatus('Local storage is not supported');
            return false;
        }
        
        localStorage.setItem(key, obj);
        
        return true;
    }
    
    // Default as session storage
    if (!this._supportsSessionStorage()) {
        this._logstatus('Session storage is not supported');
        return false;
    }
    
    sessionStorage.setItem(key, obj);
    return true;
};

AuthenticationContext.prototype._getItem = function (key) {
    
    if (this.config && this.config.cacheLocation && this.config.cacheLocation === 'localStorage') {
        
        if (!this._supportsLocalStorage()) {
            this._logstatus('Local storage is not supported');
            return null;
        }
        
        return localStorage.getItem(key);
    }
    
    // Default as session storage
    if (!this._supportsSessionStorage()) {
        this._logstatus('Session storage is not supported');
        return null;
    }
    
    return sessionStorage.getItem(key);
};

AuthenticationContext.prototype._supportsLocalStorage = function () {
    try {
        return 'localStorage' in window && window['localStorage'];
    } catch (e) {
        return false;
    }
};

AuthenticationContext.prototype._supportsSessionStorage = function () {
    try {
        return 'sessionStorage' in window && window['sessionStorage'];
    } catch (e) {
        return false;
    }
};

AuthenticationContext.prototype._cloneConfig = function (obj) {
    if (null === obj || 'object' !== typeof obj) {
        return obj;
    }
    
    var copy = {};
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) {
            copy[attr] = obj[attr];
        }
    }
    return copy;
};

AuthenticationContext.prototype._libVersion = function () {
    return '2.0.0-experimental';
};

AuthenticationContext.prototype._addClientId = function () {
    // x-client-SKU 
    // x-client-Ver 
    return '&x-client-SKU=Js&x-client-Ver=' + this._libVersion();
};

AuthenticationContext.prototype.log = function (scopes, message) {
    var correlationId = this.config.correlationId;
    var timestamp = new Date().toUTCString();
    
    var formattedMessage = timestamp + ':' + correlationId + ': ';
    
    if (scopes) {
        if (Array.isArray(scopes)) {
            formattedMessage += this._parseScope(scopes) + ':'
        }
        else {
            formattedMessage += scopes + ':';
        }
    }
    
    formattedMessage += message + ';';
    
    Logging.log(formattedMessage);
};

/**
 * Converts an array of scope into a string delimited by spaces. 
 * @param {Array} scope An array of scopes to be parsed. 
 */
AuthenticationContext.prototype._parseScope = function (scopes) {
    var scopeList = '';
    if (scopes) {
        for (var i = 0; i < scopes.length; ++i) {
            scopeList += (i !== scopes.length - 1) ? scopes[i] + ' ' : scopes[i];
        }
    }
    
    return scopeList;
};

/**
 * Checks if cached entry contains the requested scope. 
 * @param {array} scopeInCache The list of scopes stored in cache.   
 * @param {array} scopeToStore The list of scopes that are requested for token request.  
 * @returns {boolean} True if the request scopes is a subset of the stored scopes, false otherwise.  
 */
AuthenticationContext.prototype._scopeContains = function (scopeInCache, scopeToStore) {
    //Note: scopeInCache is a string containing all the scopes delimite by ' '
    //scopeToStore is an array. 
    if (!scopeInCache || this._isEmpty(scopeInCache)) {
        return false;
    }
    
    if (scopeToStore.indexOf(this.config.clientId) > -1) {
        return true;
    }
    
    for (var index = 0; index < scopeToStore.length; index++) {
        if (scopeInCache.indexOf(scopeToStore[index].toLowerCase()) === -1) {
            return false;
        }
    }
    
    return true;
};

/**
 * Creates token cache entry key for access token storage.  
 * @returns {string} The access token cache storage key. 
 */
AuthenticationContext.prototype._createTokenCacheEntryKey = function () {
    var key = {};
    if (this.config.clientId) {
        key[this.CONSTANTS.PARAMETERS.CLIENT_ID] = this.config.clientId;
    }
    
    key[this.CONSTANTS.PARAMETERS.AUTHORITY] = this.instance;
    
    this._user = this.getCachedUser();
    if (this._user && this._user.userName) {
        key[this.CONSTANTS.PARAMETERS.USERNAME] = this._user.userName;
    }
    
    return JSON.stringify(key);
};

/**
 * Creates token cache entry key for ID token storage. 
 * @returns {string} The id token cache storage key. 
 */
AuthenticationContext.prototype._createTokenCacheEntryKeyForIDToken = function () {
    var key = {};
    
    key[this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY] = this.config.clientId;
    
    return JSON.stringify(key);
};

/**
 * Creates token cache entry value based on the request info. 
 * @param {object} requestInfo  The object used to create token cache entry value. 
 * @returns {string} The token cache entry value. 
 */
AuthenticationContext.prototype._createTokenCacheEntryValue = function (requestInfo) {
    var value = {};
    if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.PARAMETERS.SCOPE)) {
        value[this.CONSTANTS.PARAMETERS.SCOPE] = requestInfo.parameters[this.CONSTANTS.PARAMETERS.SCOPE].toLowerCase();
    }
    
    if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ID_TOKEN)) {
        value[this.CONSTANTS.PARAMETERS.TOKEN] = requestInfo.parameters[this.CONSTANTS.ID_TOKEN];
        value[this.CONSTANTS.PARAMETERS.EXPIRE] = this._user.profile.exp;
    }
    else if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN)) {
        value[this.CONSTANTS.PARAMETERS.TOKEN] = requestInfo.parameters[this.CONSTANTS.ACCESS_TOKEN];
        if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.EXPIRES_IN)) {
            value[this.CONSTANTS.PARAMETERS.EXPIRE] = this._expiresIn(requestInfo.parameters[this.CONSTANTS.EXPIRES_IN]);
        }
    }
    
    return JSON.stringify(value);
};

/**
 * Check the input scopes, if it contains client id, then translate it into openid. 
 * @param {array} scopes The array of scopes to be checked. 
 */
AuthenticationContext.prototype._translateClientIdUsedInScope = function (scopes) {
    var clientIdIndex = scopes.indexOf(this.config.clientId);
    if (clientIdIndex >= 0) {
        scopes.splice(clientIdIndex, 1);
        scopes.push('openid');
    }
};

/**
 * Valiates given scopes. Make sure the input scopes is an array of scopes, openid and offline_access could not be user-provided scopes. 
 * @param {array} scopes  The array of scopes to be validated. 
 * @throw Error if input scopes is not validated. 
 */
AuthenticationContext.prototype._validateInputScope = function (scopes) {
    if (!scopes || this._isEmpty(scopes)) {
        return;
    }
    
    if (!Array.isArray(scopes)) {
        throw new Error('API does not accept non-array scopes');
    }
    
    if (scopes.indexOf('openid') > -1) {
        throw new Error('API does not accept openid as a user-provided scope');
    }
    
    if (scopes.indexOf('offline_access') > -1) {
        throw new Error('API does not accept offline_access as a user-provided scope');
    }
    
    if (scopes.indexOf(this.config.clientId) > -1) {
        if (scopes.length > 1) {
            throw new Error('Client Id can only be provided as a single scope');
        }
    }
};