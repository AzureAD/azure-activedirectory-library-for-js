﻿//----------------------------------------------------------------------
// AdalJS v0.0.1
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
var AuthenticationContext;
if (typeof module !== 'undefined' && module.exports) {
    var window, localStorage, angular, document;
    module.exports.inject = function (windowInj, localStorageInj, documentInj, MathInj, angularInj, conf) {
        window = windowInj;
        localStorage = localStorageInj;
        document = documentInj;
        Math = MathInj; // jshint ignore:line
        angular = angularInj;
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
 * @property {instance}        Azure Active Directory Instance(default:https://login.windows.net/)
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
            LOGIN_ERROR: 'adal.login.error'
        },
        RESOURCE_DELIMETER: '|',
        ERR_MESSAGES: {
            NO_TOKEN: 'User is not authorized'
        }
    };

    if (AuthenticationContext.prototype._singletonInstance) {
        return AuthenticationContext.prototype._singletonInstance;
    }
    AuthenticationContext.prototype._singletonInstance = this;

    // public
    this.instance = 'https://login.windows.net/';
    this.config = {};
    this.callback = null;
    this.popUp = false;

    // private
    this._user = null;
    this._renewActive = false;
    this._loginInProgress = false;
    this._renewStates = [];

    // validate before constructor assignments
    if (config.displayCall && typeof config.displayCall !== 'function') {
        throw new Error('displayCall is not a function');
    }

    if (!config.clientId) {
        throw new Error('clientId is required');
    }

    this.config = this._cloneConfig(config);

    // App can request idtoken for itself using clientid as resource
    if (!this.config.loginResource) {
        this.config.loginResource = this.config.clientId;
    }

    if (!this.config.redirectUri) {
        this.config.redirectUri = window.location.href;
    }

    this.config.resource = this.config.loginResource || '';
};

/**
 * Gets initial Idtoken for the app backend
 * Saves the resulting Idtoken in localStorage.
 */
AuthenticationContext.prototype.login = function () {
    // Token is not present and user needs to login
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


    var urlNavigate = this._getNavigateUrl('id_token', null) + '&nonce=' + encodeURIComponent(this._idTokenNonce);
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

AuthenticationContext.prototype._hasResource = function (key) {
    var keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS);
    return keys && !this._isEmpty(keys) && (keys.indexOf(key + this.CONSTANTS.RESOURCE_DELIMETER) > -1);
};

/**
* Gets token for the specified resource from local storage cache
* @param {string}   resource A URI that identifies the resource for which the token is valid.
* @returns {string} token if exists and not expired or null
*/
AuthenticationContext.prototype.getCachedToken = function (resource) {
    if (!this._hasResource(resource)) {
        return null;
    }

    var token = this._getItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource);
    var expired = this._getItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource);

    // If expiration is within offset, it will force renew
    var offset = this.config.expireOffsetSeconds || 120;

    if (expired && (expired > this._now() + offset)) {
        return token;
    } else {
        this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, '');
        this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, 0);
        return null;
    }
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
* @param {string}   resource  ResourceUri identifying the target resource
* @returns {string} access token if request is successfull
*/
AuthenticationContext.prototype._renewToken = function (resource, callback) {
    // use iframe to try refresh token
    // use given resource to create new authz url
    this._logstatus('renewToken is called for resource:' + resource);
    if (!this._hasResource(resource)) {
        var keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS) || '';
        this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, keys + resource + this.CONSTANTS.RESOURCE_DELIMETER);
    }

    var frameHandle = this._addAdalFrame('adalRenewFrame');
    var expectedState = this._guid() + '|' + resource;

    this.config.state = expectedState;
    // renew happens in iframe, so it keeps javascript context
    this._renewStates.push(expectedState);

    this._saveItem(this.CONSTANTS.STORAGE.FAILED_RENEW, '');

    this._logstatus('Renew token Expected state: ' + expectedState);
    var urlNavigate = this._getNavigateUrl('token', resource) + '&prompt=none&login_hint=' + encodeURIComponent(this._user.userName);
    urlNavigate += '&domain_hint=' + encodeURIComponent(this._getDomainHint());
    urlNavigate += '&nonce=' + encodeURIComponent(this._idTokenNonce);
    this.callback = callback;
    this.idTokenNonce = null;
    this._logstatus('Navigate to:' + urlNavigate);
    this._saveItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST, '');
    frameHandle.src = 'about:blank';
    this._loadFrame(urlNavigate, 'adalRenewFrame');
};

AuthenticationContext.prototype._renewIdToken = function (callback) {
    // use iframe to try refresh token
    this._logstatus('renewIdToken is called');
    if (!this._hasResource(this.config.clientId)) {
        var keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS) || '';
        this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, keys + this.config.clientId + this.CONSTANTS.RESOURCE_DELIMETER);
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
    var urlNavigate = this._getNavigateUrl('id_token', null) + '&prompt=none&login_hint=' + encodeURIComponent(this._user.userName);
    urlNavigate += '&domain_hint=' + encodeURIComponent(this._getDomainHint());
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
    setTimeout(function () {
        var frameHandle = self._addAdalFrame(frameName);
        if (frameHandle.src === '' || frameHandle.src === 'about:blank') {
            frameHandle.src = urlNavigate;
            self._loadFrame(urlNavigate);
        }
    }, 500);
};

/**
* Acquire token from cache if not expired and available. Acquires token from iframe if expired.
* @param {string}   resource  ResourceUri identifying the target resource
* @param {requestCallback} callback 
*/
AuthenticationContext.prototype.acquireToken = function (resource, callback) {
    if (this._isEmpty(resource)) {
        callback('resource is required', null);
        return;
    }

    var token = this.getCachedToken(resource);
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
    if (resource === this.config.clientId) {
        // App uses idtoken to send to api endpoints
        // Default resource is tracked as clientid to store this token
        this._logstatus('renewing idtoken');
        this._renewIdToken(callback);
    } else {
        this._renewToken(resource, callback);
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
    var keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS);

    if (!this._isEmpty(keys)) {
        keys = keys.split(this.CONSTANTS.RESOURCE_DELIMETER);
        for (var i = 0; i < keys.length; i++) {
            this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + keys[i], '');
            this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + keys[i], 0);
        }
    }
    this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, '');
};

/**
* Clear cache items for a resource.
*/
AuthenticationContext.prototype.clearCacheForResource = function (resource) {
    this._saveItem(this.CONSTANTS.STORAGE.FAILED_RENEW, '');
    this._saveItem(this.CONSTANTS.STORAGE.STATE_RENEW, '');
    this._saveItem(this.CONSTANTS.STORAGE.STATE_IDTOKEN, '');
    this._saveItem(this.CONSTANTS.STORAGE.ERROR, '');
    this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');
    if (this._hasResource(resource)) {
        this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, '');
        this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, 0);
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

AuthenticationContext.prototype._getDomainHint = function () {
    if (this._user && this._user.userName && this._user.userName.indexOf('@') > -1) {
        var parts = this._user.userName.split('@');
        // local part can include @ in quotes. Sending last part handles that.
        return parts[parts.length - 1];
    }

    return '';
};

AuthenticationContext.prototype._createUser = function (idToken) {
    var user = null;
    var parsedJson = this._extractIdToken(idToken);
    if (parsedJson && parsedJson.hasOwnProperty('aud')) {

        if (parsedJson.aud.toLowerCase() === this.config.clientId.toLowerCase()) {

            user = {
                userName: '',
                profile: parsedJson
            };

            if (parsedJson.hasOwnProperty('upn')) {
                user.userName = parsedJson.upn;
            } else if (parsedJson.hasOwnProperty('email')) {
                user.userName = parsedJson.email;
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
            parameters.hasOwnProperty('error_description') ||
            parameters.hasOwnProperty('access_token') ||
            parameters.hasOwnProperty('id_token')
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
        if (parameters.hasOwnProperty('error_description') ||
            parameters.hasOwnProperty('access_token') ||
            parameters.hasOwnProperty('id_token')) {

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

AuthenticationContext.prototype._getResourceFromState = function (state) {
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
    this._saveItem(this.CONSTANTS.STORAGE.ERROR, '');
    this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');

    // Record error
    if (requestInfo.parameters.hasOwnProperty('error_description')) {
        this._logstatus('Error :' + requestInfo.parameters.error);
        this._logstatus('Error description:' + requestInfo.parameters['error_description']);
        this._saveItem(this.CONSTANTS.STORAGE.FAILED_RENEW, requestInfo.parameters['error_description']);
        this._saveItem(this.CONSTANTS.STORAGE.ERROR, requestInfo.parameters.error);
        this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, requestInfo.parameters['error_description']);

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
            if (requestInfo.parameters.hasOwnProperty('session_state')) {
                this._saveItem(this.CONSTANTS.STORAGE.SESSION_STATE, requestInfo.parameters['session_state']);
            }

            var keys, resource;

            if (requestInfo.parameters.hasOwnProperty('access_token')) {
                this._logstatus('Fragment has access token');
                // default resource
                this._renewActive = false;
                resource = this.config.loginResource;
                if (!this._hasResource(resource)) {
                    keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS) || '';
                    this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, keys + resource + this.CONSTANTS.RESOURCE_DELIMETER);
                }

                if (requestInfo.requestType === this.REQUEST_TYPE.RENEW_TOKEN) {
                    resource = this._getResourceFromState(requestInfo.stateResponse);
                }

                // save token with related resource
                this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, requestInfo.parameters['access_token']);
                this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, this._expiresIn(requestInfo.parameters['expires_in']));
            }

            if (requestInfo.parameters.hasOwnProperty('id_token')) {
                this._loginInProgress = false;
                this._user = this._createUser(requestInfo.parameters['id_token']);
                if (this._user && this._user.profile) {
                    if (this._user.profile.nonce !== this._getItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN)) {
                        this._user = null;
                        this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, 'Nonce is not same as ' + this._idTokenNonce);
                    } else {
                        this._saveItem(this.CONSTANTS.STORAGE.IDTOKEN, requestInfo.parameters['id_token']);

                        // Save idtoken as access token for app itself
                        resource = this.config.clientId;
                        if (!this._hasResource(resource)) {
                            keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS) || '';
                            this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, keys + resource + this.CONSTANTS.RESOURCE_DELIMETER);
                        }
                        this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, requestInfo.parameters['id_token']);
                        this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, this._user.profile.exp);
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

/**
 * Gets resource for given endpoint if mapping is provided with config.
 * @param {string} endpoint  -  API endoibt
 * @returns {string} resource for this API endpoint
 */
AuthenticationContext.prototype.getResourceForEndpoint = function (endpoint) {
    if (this.config && this.config.endpoints) {
        for (var configEndpoint in this.config.endpoints) {
            // configEndpoint is like /api/Todo requested endpoint can be /api/Todo/1
            if (endpoint.indexOf(configEndpoint) > -1) {
                return this.config.endpoints[configEndpoint];
            }
        }
    }

    // default resource will be clientid if nothing specified
    // App will use idtoken for calls to itself
    return this.config.loginResource;
};

/*exported  oauth2Callback */
AuthenticationContext.prototype.handleWindowCallback = function () {
    // This is for regular javascript usage for redirect handling
    // need to make sure this is for callback
    var hash = window.location.hash;
    if (this.isCallback(hash)) {
        var requestInfo = this.getRequestInfo(hash);
        this.saveTokenFromHash(requestInfo);
        var callback = null;
        if ((requestInfo.requestType === this.REQUEST_TYPE.RENEW_TOKEN ||
            requestInfo.requestType === this.REQUEST_TYPE.ID_TOKEN) &&
            window.parent) {
            // iframe call but same single page
            console.log('Window is in iframe');
            callback = window.parent.AuthenticationContext().callback;
            window.src = '';
        } else if (window && window.oauth2Callback) {
            console.log('Window is redirecting');
            callback = this.callback;
        }

        window.location.hash = '';
        if (requestInfo.requestType === this.REQUEST_TYPE.RENEW_TOKEN) {
            callback(this._getItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters['access_token']);
            return;
        } else if (requestInfo.requestType === this.REQUEST_TYPE.ID_TOKEN) {
            // JS context may not have the user if callback page was different, so parse idtoken again to callback
            callback(this._getItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION), this._createUser(this._getItem(this.CONSTANTS.STORAGE.IDTOKEN)));
            return;
        }
    }
};

AuthenticationContext.prototype._getNavigateUrl = function (responseType, resource) {
    var tenant = 'common';
    if (this.config.tenant) {
        tenant = this.config.tenant;
    }

    if (this.config.instance) {
        this.instance = this.config.instance;
    }

    var urlNavigate = this.instance + tenant + '/oauth2/authorize' + this._serialize(responseType, this.config, resource);
    console.log('Navigate url:' + urlNavigate);
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
    if (window.atob) {
        return window.atob(base64IdToken);
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

AuthenticationContext.prototype._serialize = function (responseType, obj, resource) {
    var str = [];
    if (obj !== null) {
        str.push('?response_type=' + responseType);
        str.push('client_id=' + encodeURIComponent(obj.clientId));
        if (resource) {
            str.push('resource=' + encodeURIComponent(resource));
        }

        str.push('redirect_uri=' + encodeURIComponent(obj.redirectUri));
        str.push('state=' + encodeURIComponent(obj.state));

        if (obj.hasOwnProperty('slice')) {
            str.push('slice=' + encodeURIComponent(obj.slice));
        }

        if (obj.hasOwnProperty('extraQueryParameter')) {
            str.push(obj.extraQueryParameter);
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
    if (!this._supportsLocalStorage()) {
        this._logStatus('Local storage is not supported');
        return false;
    }

    localStorage.setItem(key, obj);

    return true;
};

AuthenticationContext.prototype._getItem = function (key) {
    if (!this._supportsLocalStorage()) {
        this._logstatus('Local storage is not supported');
        return null;
    }

    return localStorage.getItem(key);
};

AuthenticationContext.prototype._supportsLocalStorage = function () {
    try {
        return 'localStorage' in window && window['localStorage'];
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

function adalAngularModules() {
    // ============= Angular modules- Start =============
    if (typeof angular !== 'undefined') {

        var AdalModule = angular.module('AdalAngular', []);

        // Interceptor for http if needed
        AdalModule.factory('ProtectedResourceInterceptor', ['$q', '$rootScope', '$injector', function ($q, $rootScope, $injector) {
            var authService;
            var injectAuthService = function () {
                authService = authService || $injector.get('adalAuthenticationService');
            };

            return {
                request: function (config) {
                    if (config) {
                        if (!$injector.has('adalAuthenticationService')) {
                            return config;
                        }
                        injectAuthService();
                        // This interceptor needs to load service, but dependeny definition causes circular reference error.
                        // Loading with injector is suggested at github. https://github.com/angular/angular.js/issues/2367
                        authService = authService || $injector.get('adalAuthenticationService');
                        config.headers = config.headers || {};

                        var resource = authService.getResourceForEndpoint(config.url);
                        var tokenStored = authService.getCachedToken(resource);
                        if (tokenStored) {
                            // check endpoint mapping if provided
                            config.headers.Authorization = 'Bearer ' + tokenStored;
                            return config;
                        } else {
                            // Cancel request if login is starting
                            if (authService.loginInProgress()) {
                                $q.reject();
                                return;
                            } else if (authService.config && resource !== authService.config.clientId) {
                                // external endpoints
                                // delayed request to return after iframe completes
                                var delayedRequest = $q.defer();
                                authService.acquireToken(resource).then(function (token) {
                                    config.headers.Authorization = 'Bearer ' + token;
                                    delayedRequest.resolve(config);
                                }, function (err) {
                                    delayedRequest.reject(err);
                                });

                                return delayedRequest.promise;
                            }
                        }

                        return config;
                    }
                },
                responseError: function (rejection) {
                    if (rejection.status === 401) {
                        injectAuthService();
                        var resource = authService.getResourceForEndpoint(rejection.config.url);
                        authService.clearCacheForResource(resource);
                        $rootScope.$broadcast('adal:notAuthorized', rejection, resource);
                    }

                    return $q.reject(rejection);
                }
            };
        }]);

        var AdalService = function () {
            var _adal = null;
            var _oauthData = { isAuthenticated: false, userName: '', loginError: '', profile: '' };

            var updateDataFromCache = function (resource) {
                // only cache lookup here to not interrupt with events
                var token = _adal.getCachedToken(resource);
                _oauthData.isAuthenticated = token !== null && token.length > 0;
                var user = _adal.getCachedUser() || { userName: '' };
                _oauthData.userName = user.userName;
                _oauthData.profile = user.profile;
                _oauthData.loginError = _adal.getLoginError();
            };

            this.init = function (configOptions, httpProvider) {
                if (configOptions) {
                    // redirect and logout_redirect are set to current location by default
                    var existingHash = window.location.hash;
                    var pathDefault = window.location.href;
                    if (existingHash) {
                        pathDefault = pathDefault.replace(existingHash, '');
                    }
                    configOptions.redirectUri = configOptions.redirectUri || pathDefault;
                    configOptions.postLogoutRedirectUri = configOptions.postLogoutRedirectUri || pathDefault;

                    if (httpProvider && httpProvider.interceptors) {
                        httpProvider.interceptors.push('ProtectedResourceInterceptor');
                    }

                    // create instance with given config
                    _adal = new AuthenticationContext(configOptions);
                } else {
                    throw new Error('You must set configOptions, when calling init');
                }

                // loginresource is used to set authenticated status
                updateDataFromCache(_adal.config.loginResource);
            };

            // special function that exposes methods in Angular controller
            // $rootScope, $window, $http, $q, $location, $timeout are injected by Angular
            this.$get = function ($rootScope, $window, $http, $q, $location, $timeout) {

                var locationChangeHandler = function () {
                    var hash = $window.location.hash;

                    if (_adal.isCallback(hash)) {
                        // callback can come from login or iframe request

                        var requestInfo = _adal.getRequestInfo(hash);
                        _adal.saveTokenFromHash(requestInfo);
                        $window.location.hash = '';

                        if (requestInfo.requestType !== _adal.REQUEST_TYPE.LOGIN) {
                            _adal.callback = $window.parent.AuthenticationContext().callback;
                        }

                        // Return to callback if it is send from iframe
                        if (requestInfo.stateMatch) {
                            if (typeof _adal.callback === 'function') {
                                // Call within the same context without full page redirect keeps the callback
                                if (requestInfo.requestType === _adal.REQUEST_TYPE.RENEW_TOKEN) {
                                    // Idtoken or Accestoken can be renewed
                                    if (requestInfo.parameters['access_token']) {
                                        _adal.callback(_adal._getItem(_adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters['access_token']);
                                        return;
                                    } else if (requestInfo.parameters['id_token']) {
                                        _adal.callback(_adal._getItem(_adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters['id_token']);
                                        return;
                                    }
                                }
                            } else {
                                // normal full login redirect happened on the page
                                updateDataFromCache(_adal.config.loginResource);
                                if (_oauthData.userName) {
                                    //IDtoken is added as token for the app
                                    $timeout(function () {
                                        updateDataFromCache(_adal.config.loginResource);
                                        $rootScope.userInfo = _oauthData;
                                        // redirect to login requested page
                                        var loginStartPage = _adal._getItem(_adal.CONSTANTS.STORAGE.START_PAGE);
                                        if (loginStartPage) {
                                            $location.path(loginStartPage);
                                        }
                                    }, 1);
                                    $rootScope.$broadcast('adal:loginSuccess');
                                } else {
                                    $rootScope.$broadcast('adal:loginFailure', _adal._getItem(_adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION));
                                }
                            }
                        }
                    } else {
                        // No callback. App resumes after closing or moving to new page.
                        // Check token and username             
                        updateDataFromCache(_adal.config.loginResource);
                        if (!_adal._renewActive && !_oauthData.isAuthenticated && _oauthData.userName) {
                            if (!_adal._getItem(_adal.CONSTANTS.STORAGE.FAILED_RENEW)) {
                                _adal.acquireToken(_adal.config.loginResource, function (error, tokenOut) {
                                    if (error) {
                                        $rootScope.$broadcast('adal:loginFailure', 'auto renew failure');
                                    } else {
                                        if (tokenOut) {
                                            _oauthData.isAuthenticated = true;
                                        }
                                    }
                                });
                            }
                        }
                    }

                    $timeout(function () {
                        updateDataFromCache(_adal.config.loginResource);
                        $rootScope.userInfo = _oauthData;
                    }, 1);
                };

                var routeChangeHandler = function (e, nextRoute) {
                    if (nextRoute.$$route && nextRoute.$$route.requireADLogin) {
                        if (!_oauthData.isAuthenticated) {
                            console.log('Route change event for:' + nextRoute.$$route.originalPath);
                            if (_adal.config && _adal.config.localLoginUrl) {
                                $location.path(_adal.config.localLoginUrl);
                            } else {
                                // directly start login flow
                                _adal._saveItem(_adal.CONSTANTS.STORAGE.START_PAGE, nextRoute.$$route.originalPath);
                                console.log('Start login at:' + window.location.href);
                                $rootScope.$broadcast('adal:loginRedirect');
                                _adal.login();
                            }
                        }
                    }
                };

                 var stateChangeHandler = function (e, nextRoute) {
                    if (nextRoute && nextRoute.requireADLogin) {
                        if (!_oauthData.isAuthenticated) {
                            console.log('Route change event for:' + nextRoute.url);
                            if (_adal.config && _adal.config.localLoginUrl) {
                                $location.path(_adal.config.localLoginUrl);
                            } else {
                                // directly start login flow
                                _adal._saveItem(_adal.CONSTANTS.STORAGE.START_PAGE, nextRoute.url);
                                console.log('Start login at:' + window.location.href);
                                $rootScope.$broadcast('adal:loginRedirect');
                                _adal.login();
                            }
                        }
                    }
                };
                // Route change event tracking to receive fragment and also auto renew tokens
                $rootScope.$on('$routeChangeStart', routeChangeHandler);
                // State change event handler
                $rootScope.$on('$stateChangeStart', stateChangeHandler);
                
                $rootScope.$on('$locationChangeStart', locationChangeHandler);

                updateDataFromCache(_adal.config.loginResource);
                $rootScope.userInfo = _oauthData;

                return {
                    // public methods will be here that are accessible from Controller
                    config: _adal.config,
                    login: function () {
                        _adal.login();
                    },
                    loginInProgress: function () {
                        return _adal.loginInProgress();
                    },
                    logOut: function () {
                        _adal.logOut();
                        //call signout related method
                    },
                    getCachedToken: function (resource) {
                        return _adal.getCachedToken(resource);
                    },
                    userInfo: _oauthData,
                    acquireToken: function (resource) {
                        // automated token request call
                        var deferred = $q.defer();
                        _adal.acquireToken(resource, function (error, tokenOut) {
                            if (error) {
                                _adal._logstatus('err :' + error);
                                deferred.reject(error);
                            } else {
                                deferred.resolve(tokenOut);
                            }
                        });

                        return deferred.promise;
                    },
                    getUser: function () {
                        var deferred = $q.defer();
                        _adal.getUser(function (error, user) {
                            if (error) {
                                _adal._logstatus('err :' + error);
                                deferred.reject(error);
                            } else {
                                deferred.resolve(user);
                            }
                        });

                        return deferred.promise;
                    },
                    getResourceForEndpoint: function (endpoint) {
                        return _adal.getResourceForEndpoint(endpoint);
                    },
                    clearCache: function () {
                        _adal.clearCache();
                    },
                    clearCacheForResource: function (resource) {
                        _adal.clearCacheForResource(resource);
                    }
                };
            };
        };

        // Service that is accessible at config to init and controllers to use API methods
        AdalModule.provider('adalAuthenticationService', function () {
            return new AdalService();
        });
    } else {
        console.log('Angular.JS is not included');
    }
}
adalAngularModules();
// ============= Angular modules- End =============
