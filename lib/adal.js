//----------------------------------------------------------------------
// Copyright (c) Microsoft Open Technologies, Inc.
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

// node.js usage for tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports.inject = function (windowInj, localStorageInj, documentInj, MathInj, conf) {
        window = windowInj;
        localStorage = localStorageInj;
        Math = MathInj;
        document = documentInj;
        return new AuthenticationContext(conf);
    };
}

/**
 * Config information
 * @public
 * @class Config
 * @property {tenant}           Your tenant related your app
 * @property {client_id}        App ID that you register at Azure Active Directory UX portal
 * @property {redirect_uri}     Redirect page that will receive the token
 * @property {loginResource}    Resource to use to send request for login
 * @property {instance}         Authorization server instance default:https://login.windows.net/
 * @property {localLoginUrl}         Authorization server instance default:https://login.windows.net/
 */

/**
 * Creates a new AuthenticationContext object.
 * @constructor
 * @param {Config}  config               Configuration options for AuthenticationContext
 *
 **/
var AuthenticationContext = function(config) {
    REQUEST_TYPE = {
        LOGIN: 'LOGIN',
        RENEW_TOKEN: 'RENEW_TOKEN',
        ID_TOKEN: 'ID_TOKEN',
        UNKNOWN: 'UNKNOWN'
    };

    CONSTANTS = {
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
            SESSION_STATE: 'adal.session.state',
            USERNAME: 'adal.username',
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

    this.CONSTANTS = CONSTANTS;

    //TODO supported singleton over JS1.5 check JS version
    // this is not supported in strict mode
    if (arguments.callee._singletonInstance) {
        return arguments.callee._singletonInstance;
    }
    arguments.callee._singletonInstance = this;
    this.instance = 'https://login.windows.net/';
    this.config = config;
    this.config.resource = this.config.loginResource || '';
    this.callback = null;
    this.popUp = false;
    this.startPage = null;
    this.user = null;
    this.frameRequestType = REQUEST_TYPE.UNKNOWN;
};

// callback is used if it does not do full page redirect and keeps the JS context
AuthenticationContext.prototype.login = function () {
    // Token is not present and user needs to login
    var expectedState = this._guid();
    this.config.state = expectedState;
    logStatus('Expected state: ' + expectedState + ' startPage:' + window.location);
    this._saveItem(CONSTANTS.STORAGE.LOGIN_REQUEST, window.location);
    this._saveItem(CONSTANTS.STORAGE.LOGIN_ERROR, '');
    this._saveItem(CONSTANTS.STORAGE.STATE_LOGIN, expectedState);
    this._saveItem(CONSTANTS.STORAGE.FAILED_RENEW, '');
    this._saveItem(CONSTANTS.STORAGE.ERROR, '');
    this._saveItem(CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');

    var urlNavigate = this._getNavigateUrl('token');
    this.frameCallInProgress = false;
    if (this.config.displayCall != 'undefined' && typeof this.config.displayCall == 'function') {
        // User defined way of handling the navigation
        this.config.displayCall(urlNavigate);
    } else {
        this.promptUser(urlNavigate);
    }
    // callback from redirected page will receive fragment. It needs to call oauth2Callback
};

AuthenticationContext.prototype._hasResource = function (key) {
    var keys = this._getItem(CONSTANTS.STORAGE.TOKEN_KEYS);
    return keys && !this._isEmpty(keys) && (keys.indexOf(key + CONSTANTS.RESOURCE_DELIMETER) > -1);
}

// direct cache lookup
AuthenticationContext.prototype.getCachedToken = function (resource) {
    // TODO this will use cache key based on resource
    if (!this._hasResource(resource)) {
        return null;
    }

    var token = this._getItem(CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource);
    var expired = this._getItem(CONSTANTS.STORAGE.EXPIRATION_KEY + resource);

    // Expire before actual time based on config to renew token before expired
    var offset = this.config.expireOffsetSeconds || 120;

    if (expired && (expired > this._now() + offset)) {
        return token;
    } else {
        this._saveItem(CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, '');
        this._saveItem(CONSTANTS.STORAGE.EXPIRATION_KEY + resource, 0);
        return null;
    }
};

AuthenticationContext.prototype.getCachedUser = function () {
    return this._getItem(CONSTANTS.STORAGE.USERNAME);
};

AuthenticationContext.prototype.setStartPage = function (page) {
    // for test
    this.startPage = page;
};

AuthenticationContext.prototype.isRenewingToken = function () {
    return this._getItem(CONSTANTS.STORAGE.STATE_RENEW);
};

// var errorResponse = {error:'', error_description:''};
// var token = 'string token';
// callback(errorResponse, token)
// with callback
AuthenticationContext.prototype._renewToken = function (resource, callback) {
    // use iframe to try refresh token
    // use given resource to create new authz url
    logStatus('renewToken is called for resource:' + resource);
    if (!this._hasResource(resource)) {
        var keys = this._getItem(CONSTANTS.STORAGE.TOKEN_KEYS) || '';
        this._saveItem(CONSTANTS.STORAGE.TOKEN_KEYS, resource + CONSTANTS.RESOURCE_DELIMETER);
    }
    var frameHandle = this._addAdalFrame('adalRenewFrame');
    var expectedState = this._guid();

    this.config.state = expectedState;
    this._saveItem(CONSTANTS.STORAGE.STATE_RENEW, expectedState);
    this._saveItem(CONSTANTS.STORAGE.STATE_RENEW_RESOURCE, resource);
    this._saveItem(CONSTANTS.STORAGE.FAILED_RENEW, '');

    logStatus('Renew token Expected state: ' + expectedState);
    var urlNavigate = this._getNavigateUrl('token') + '&prompt=none';
    this.callback = callback;
    this.idTokenNonce = null;
    logStatus('Navigate to:' + urlNavigate);
    this._saveItem(CONSTANTS.STORAGE.LOGIN_REQUEST, '');
    frameHandle.src = urlNavigate;
};

// var errorResponse = {error:'', error_description:''};
// var token = 'string token';
// callback(errorResponse, token)
// do all attempts to get a token. It can be called at initializing page.
AuthenticationContext.prototype.acquireToken = function (resource, callback) {
    if (this._isEmpty(resource)) {
        resource = this.config.loginResource;
    }

    var token = this.getCachedToken(resource);
    if (token) {
        logStatus('Token in cache');
        if (typeof callback === 'function') {
            callback(null, token);
        }
        return;
    }

    if (this._getItem(CONSTANTS.STORAGE.FAILED_RENEW)) {
        logStatus('renewToken is failed:' + this._getItem(CONSTANTS.STORAGE.FAILED_RENEW));
        if (typeof callback === 'function') {
            callback(this._getItem(CONSTANTS.STORAGE.FAILED_RENEW), null);
        }
        return;
    }

    // refresh attept with iframe
    this._renewToken(resource, callback);
};

// this will prompt the user and call OauthCallback with fragment
// it is separated so that it can be overwritten
AuthenticationContext.prototype.promptUser = function (urlNavigate) {
    if (urlNavigate) {
        logStatus('Navigate to:' + urlNavigate);
        window.location.replace(urlNavigate);
    } else {
        logStatus('Navigate url is empty');
    }
};

AuthenticationContext.prototype.clearCache = function () {
    this._saveItem(CONSTANTS.STORAGE.ACCESS_TOKEN_KEY, '');
    this._saveItem(CONSTANTS.STORAGE.EXPIRATION_KEY, 0);
    this._saveItem(CONSTANTS.STORAGE.FAILED_RENEW, '');
    this._saveItem(CONSTANTS.STORAGE.SESSION_STATE, '');
    this._saveItem(CONSTANTS.STORAGE.STATE_LOGIN, '');
    this._saveItem(CONSTANTS.STORAGE.STATE_RENEW, '');
    this._saveItem(CONSTANTS.STORAGE.STATE_RENEW_RESOURCE, '');    
    this._saveItem(CONSTANTS.STORAGE.STATE_IDTOKEN, '');
    this._saveItem(CONSTANTS.STORAGE.START_PAGE, '');
    this._saveItem(CONSTANTS.STORAGE.USERNAME, '');
    this._saveItem(CONSTANTS.STORAGE.ERROR, '');
    this._saveItem(CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');
    var keys = this._getItem(CONSTANTS.STORAGE.TOKEN_KEYS);
    if (!this._isEmpty(keys)) {
        keys = keys.split(CONSTANTS.RESOURCE_DELIMETER);
        for (var i = 0; i < keys.length; i++) {
            this._saveItem(CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + keys[i], '');
            this._saveItem(CONSTANTS.STORAGE.EXPIRATION_KEY + keys[i], 0);
        }
    }
    this._saveItem(CONSTANTS.STORAGE.TOKEN_KEYS, '');
};

AuthenticationContext.prototype.clearCacheForResource = function (resource) {
    // TODO allow firing renew for different resources at the same time
    this._saveItem(CONSTANTS.STORAGE.FAILED_RENEW, '');
    this._saveItem(CONSTANTS.STORAGE.STATE_RENEW, '');
    this._saveItem(CONSTANTS.STORAGE.STATE_IDTOKEN, '');
    this._saveItem(CONSTANTS.STORAGE.ERROR, '');
    this._saveItem(CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');
    if (this._hasResource(resource)) {
        this._saveItem(CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, '');
        this._saveItem(CONSTANTS.STORAGE.EXPIRATION_KEY + resource, 0);
    }
};

AuthenticationContext.prototype.logOut = function () {
    this.clearCache();
    var tenant = 'common';
    var logout = '';
    if (typeof this.config.tenant != 'undefined') {
        tenant = this.config.tenant;
    }

    if (typeof this.config.instance != 'undefined') {
        this.instance = this.config.instance;
    }

    if (typeof this.config.post_logout_redirect_uri != 'undefined') {
        logout = 'post_logout_redirect_uri=' + encodeURIComponent(this.config.post_logout_redirect_uri);
    }

    var urlNavigate = this.instance + tenant + '/oauth2/logout?' + logout;
    logStatus('Logout navigate to: ' + urlNavigate);
    this.promptUser(urlNavigate);
};

AuthenticationContext.prototype._isEmpty = function (str) {
    return (typeof str == 'undefined' || !str || 0 === str.length);
};

// callback(err, result)
AuthenticationContext.prototype.getUser = function (callback) {
    // get cached token
    var token = this.getCachedToken(this.config.loginResource);
    this.callback = callback;
    if (token) {
        // frame is used to get idtoken
        var userInStorage = this._getItem(CONSTANTS.STORAGE.USERNAME);
        if (!this._isEmpty(userInStorage)) {
            logStatus('User exists in cache: ' + userInStorage);
            this.callback(null, userInStorage);
            return;
        }

        if (this._getItem(CONSTANTS.STORAGE.FAILED_RENEW)) {
            logStatus('renewToken is failed:' + this._getItem(CONSTANTS.STORAGE.FAILED_RENEW));
            this.callback(this._getItem(CONSTANTS.STORAGE.FAILED_RENEW), null);
            return;
        }

        this._getIdTokenInFrame(callback);
    } else {
        logStatus('User is not authorized');
        this.callback(CONSTANTS.ERR_MESSAGES.NO_TOKEN, null);
    }
};

AuthenticationContext.prototype._getIdTokenInFrame = function (callback) {
    var expectedState = this._guid();
    this.config.state = expectedState;
    var frameHandle = this._addAdalFrame('adalIdTokenFrame');
    logStatus('Expected state: ' + expectedState + ' start for iframe');

    this._saveItem(CONSTANTS.STORAGE.STATE_IDTOKEN, expectedState);
    this._saveItem(CONSTANTS.STORAGE.USERNAME, '');

    // send request in iframe for idtoken
    this._idTokenNonce = this._guid();
    var urlNavigate = this._getNavigateUrl('id_token') + '&prompt=none&nonce=' + this._idTokenNonce;
    this.callback = callback;
    logStatus('Navigate to:' + urlNavigate);
    frameHandle.src = urlNavigate;
};

AuthenticationContext.prototype._getHash = function (hash) {
    if (hash.indexOf('#/') > -1) {
        hash = hash.substring(hash.indexOf('#/') + 2);
    } else if (hash.indexOf('#') > -1) {
        hash = hash.substring(1);
    }
    return hash;
}

// is it waiting for something
AuthenticationContext.prototype.isCallback = function (hash) {
    hash = this._getHash(hash);
    var parameters = this._deserialize(hash);
    return (
            parameters.hasOwnProperty('error_description') ||
            parameters.hasOwnProperty('access_token') ||
            parameters.hasOwnProperty('id_token')
            );
};

AuthenticationContext.prototype.getLoginError = function () {
    return this._getItem(CONSTANTS.STORAGE.LOGIN_ERROR);
}

AuthenticationContext.prototype.getRequestInfo = function (hash) {
    hash = this._getHash(hash);
    var parameters = this._deserialize(hash);
    var requestInfo = { valid: false, parameters: {}, stateMatch: false, stateResponse: '', requestType: REQUEST_TYPE.UNKNOWN };
    if (parameters) {
        requestInfo.parameters = parameters;
        if (parameters.hasOwnProperty('error_description') ||
            parameters.hasOwnProperty('access_token') ||
            parameters.hasOwnProperty('id_token')) {

            requestInfo.valid = true;

            // which call
            var stateResponse = '';
            if (parameters.hasOwnProperty('state')) {
                logStatus('State: ' + parameters.state);
                stateResponse = parameters.state;
            } else {
                logStatus('No state returned');
            }

            requestInfo.stateResponse = stateResponse;

            // async calls can fire iframe and login request at the same time if developer does not use the API as expected
            // incoming callback needs to be looked up to find the request type
            switch (stateResponse) {
                case this._getItem(CONSTANTS.STORAGE.STATE_LOGIN):
                    loginRequest = true;
                    requestInfo.requestType = REQUEST_TYPE.LOGIN;
                    requestInfo.stateMatch = true;
                    break;
                case this._getItem(CONSTANTS.STORAGE.STATE_RENEW):
                    requestInfo.requestType = REQUEST_TYPE.RENEW_TOKEN;
                    requestInfo.stateMatch = true;
                    this._saveItem(CONSTANTS.STORAGE.STATE_RENEW, '');
                    break;
                case this._getItem(CONSTANTS.STORAGE.STATE_IDTOKEN):
                    requestInfo.requestType = REQUEST_TYPE.ID_TOKEN;
                    this._saveItem(CONSTANTS.STORAGE.STATE_IDTOKEN, '');
                    requestInfo.stateMatch = true;
                    break;
            }

            logStatus("Login state:" + this._getItem(CONSTANTS.STORAGE.STATE_LOGIN)
                + " renew:" + this._getItem(CONSTANTS.STORAGE.STATE_RENEW)
                + " idtoken" + this._getItem(CONSTANTS.STORAGE.STATE_IDTOKEN))
        }
    }

    return requestInfo;
}

AuthenticationContext.prototype.saveTokenFromHash = function (requestInfo) {
    var errorResponse = null;
    var loginRequest = false;
    logStatus('State status:' + requestInfo.stateMatch);
    this._saveItem(CONSTANTS.STORAGE.ERROR, '');
    this._saveItem(CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');

    // Record error
    if (requestInfo.parameters.hasOwnProperty('error_description')) {
        logStatus('Error :' + requestInfo.parameters.error);
        logStatus('Error description:' + requestInfo.parameters.error_description);
        errorResponse = {
            error: requestInfo.parameters.error,
            error_description: requestInfo.parameters.error_description
        };
        this._saveItem(CONSTANTS.STORAGE.FAILED_RENEW, requestInfo.parameters.error_description);
        this._saveItem(CONSTANTS.STORAGE.ERROR, requestInfo.parameters.error);
        this._saveItem(CONSTANTS.STORAGE.ERROR_DESCRIPTION, requestInfo.parameters.error_description);

        if (requestInfo.requestType == REQUEST_TYPE.LOGIN) {
            this._saveItem(CONSTANTS.STORAGE.LOGIN_ERROR, requestInfo.parameters.error_description);
        }
    } else {

        // It must verify the state from redirect
        if (requestInfo.stateMatch) {
            // record tokens to storage if exists
            logStatus('State is right');
            if (requestInfo.parameters.hasOwnProperty('session_state')) {
                this._saveItem(CONSTANTS.STORAGE.SESSION_STATE, requestInfo.parameters.session_state);
            }

            if (requestInfo.parameters.hasOwnProperty('access_token')) {
                logStatus('Fragment has access token');
                // default resource
                var resource = this.config.loginResource;
                if (!this._hasResource(resource)) {
                    var keys = this._getItem(CONSTANTS.STORAGE.TOKEN_KEYS) || '';
                    this._saveItem(CONSTANTS.STORAGE.TOKEN_KEYS, resource + CONSTANTS.RESOURCE_DELIMETER);
                }

                if (requestInfo.requestType == REQUEST_TYPE.RENEW_TOKEN) {
                    resource = this._getItem(CONSTANTS.STORAGE.STATE_RENEW_RESOURCE);
                }

                // save token with related resource
                this._saveItem(CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, requestInfo.parameters['access_token']);
                this._saveItem(CONSTANTS.STORAGE.EXPIRATION_KEY + resource, this._expiresIn(requestInfo.parameters['expires_in']));
            }

            if (requestInfo.parameters.hasOwnProperty('id_token')) {
                logStatus('Fragment has IdToken');
                this._saveItem(CONSTANTS.STORAGE.USERNAME, this._extractUserName(requestInfo.parameters.id_token));
            }
        } else {
            this._saveItem(CONSTANTS.STORAGE.ERROR, 'Invalid_state');
            this._saveItem(CONSTANTS.STORAGE.ERROR_DESCRIPTION, 'Invalid_state');
            if (requestInfo.requestType == REQUEST_TYPE.LOGIN) {
                this._saveItem(CONSTANTS.STORAGE.LOGIN_ERROR, 'State is not same as ' + requestInfo.stateResponse);
            }
        }
    }
};

AuthenticationContext.prototype.getResourceForEndpoint = function (endpoint) {
    if (this.config && this.config.endpoints) {
        if (this.config.endpoints.hasOwnProperty(endpoint) && !this._isEmpty(this.config.endpoints[endpoint])) {
            return this.config.endpoints[endpoint];
        }

        // endpoint does not have resource defined
        return '';
    }

    // default resource
    return this.config.loginResource;
}

function handleWindowCallback(hash) {
    // need to make sure this is for callback
    if (window.parent && window.parent.oauth2Callback) {
        // iframe call
        console.log('Window is in iframe');
        window.parent.setTimeout(window.parent.oauth2Callback(hash, true), 1);
        window.src = '';
    } else if (window && window.oauth2Callback) {
        console.log('Window is redirecting');
        window.setTimeout(window.oauth2Callback(hash, false), 1);
    } else if (window && window.opener) {
        console.log('Window is a pop up');
        window.opener.setTimeout(window.opener.oauth2Callback(hash, false), 1);
        window.close();
    };
};

function oauth2Callback(hash, iframeRequest) {
    // Configuration is not important. It will use the saved state and saved last location to handle callback.
    console.log('Saved info from hash');
    var adal = new AuthenticationContext();
    adal.oauth2Callback(hash, iframeRequest);
};

AuthenticationContext.prototype._getNavigateUrl = function (responseType) {
    var tenant = 'common';
    if (this.config.tenant) {
        tenant = this.config.tenant;
    }

    if (this.config.instance) {
        this.instance = this.config.instance;
    }

    var urlNavigate = this.instance + tenant + '/oauth2/authorize' + this._serialize(responseType, this.config);
    console.log('Navigate url:' + urlNavigate);
    return urlNavigate;
};

AuthenticationContext.prototype._extractUserName = function (encodedIdToken) {
    // id token will be decoded to get the username
    var crackedToken = this._crackJwt(encodedIdToken);
    if (!crackedToken) {
        return null;
    }

    try {
        var base64IdToken = crackedToken.JWSPayload;
        var base64Decoded = this._base64DecodeStringUrlSafe(base64IdToken);
        if (!base64Decoded) {
            logStatus('The returned id_token could not be base64 url safe decoded.');
            return null;
        }

        // ECMA script has JSON built-in support
        var parsed = JSON.parse(base64Decoded);
        if (parsed.hasOwnProperty('upn')) {
            return parsed.upn;
        } else if (parsed.hasOwnProperty('email')) {
            return parsed.email;
        }
    } catch (err) {
        logStatus('The returned id_token could not be decoded: ' + err.stack);
    }

    return null;
};

AuthenticationContext.prototype._base64DecodeStringUrlSafe = function (base64IdToken) {
    // html5 should support atob function for decoding
    if (window.atob) {
        return atob(base64IdToken);
    }

    // TODO add support for this
    logStatus('Browser is not supported');
    return null;
};

// Adal.node js crack function
AuthenticationContext.prototype._crackJwt = function (jwtToken) {
    var idTokenPartsRegex = /^([^\.\s]*)\.([^\.\s]+)\.([^\.\s]*)$/;

    var matches = idTokenPartsRegex.exec(jwtToken);
    if (!matches || matches.length < 4) {
        this._log.warn('The returned id_token is not parseable.');
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

AuthenticationContext.prototype._serialize = function (responseType, obj) {
    var str = [];
    if (obj != null) {
        str.push('?response_type=' + responseType);
        str.push('client_id=' + encodeURIComponent(obj['clientId']));
        str.push('resource=' + encodeURIComponent(obj['resource']));
        str.push('redirect_uri=' + encodeURIComponent(obj['redirect_uri']));
        str.push('state=' + encodeURIComponent(obj['state']));
        if (obj.hasOwnProperty('slice')) {
            str.push('slice=' + encodeURIComponent(obj['slice']));
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
    while (match = search.exec(query)) {
        obj[decode(match[1])] = decode(match[2]);
    }

    return obj;
};

AuthenticationContext.prototype._guid = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

AuthenticationContext.prototype._expiresIn = function (expires) {
    return this._now() + parseInt(expires, 10);
};

AuthenticationContext.prototype._now = function () {
    return Math.round(new Date().getTime() / 1000.0);
};

AuthenticationContext.prototype._addAdalFrame = function(iframeId) {
    console.log('Add adal frame to document:' + iframeId);
    var adalFrame = document.getElementById(iframeId);

    if (typeof adalFrame === 'undefined' || adalFrame == null) {

        if (document.createElement && document.documentElement &&
            (window.opera || navigator.userAgent.indexOf('MSIE 5.0') == -1)) {
            var ifr = document.createElement('iframe');
            ifr.setAttribute('id', iframeId);
            ifr.style.visibility = 'hidden';
            ifr.style.position = 'absolute';
            ifr.style.width = ifr.style.height = ifr.borderWidth = '0px';

            adalFrame = document.getElementsByTagName('body')[0].appendChild(ifr);
        }
        else if (document.body && document.body.insertAdjacentHTML) {
            document.body.insertAdjacentHTML('beforeEnd', "<iframe name='" + iframeId + "' id='" + iframeId + "' style='display:none'></iframe>");
        }
        if (window.frames && window.frames[iframeId]) {
            adalFrame = window.frames[iframeId];
        }
    }

    return adalFrame;
};

function logStatus(msg) {
    if (console != undefined) {
        console.log(msg);
    }
};

AuthenticationContext.prototype._saveItem = function (key, obj) {
    if (!supportsLocalStorage()) {
        logStatus('Local storage is not supported');
        return false;
    }

    localStorage.setItem(key, obj);

    return true;
};

AuthenticationContext.prototype._getItem = function (key) {
    if (!supportsLocalStorage()) {
        logStatus('Local storage is not supported');
        return null;
    }

    return localStorage.getItem(key);
};

// ============= Angular modules- Start =============
if (typeof angular != 'undefined') {

    var AdalModule = angular.module('AdalAngular', []);

    // Interceptor for http if needed
    AdalModule.factory('ProtectedResourceInterceptor', ['$q', '$rootScope', function ($q, $rootScope) {
        var adalRef = new AuthenticationContext();
        return {
            request: function (config) {
                if (config) {
                    config.headers = config.headers || {};
                    var resource = adalRef.getResourceForEndpoint(config.url);
                    var tokenStored = adalRef.getCachedToken(resource);
                    if (tokenStored) {
                        // check endpoint mapping if provided
                        config.headers.Authorization = 'Bearer ' + tokenStored;
                    }
                }

                return config;
            },
            response: function (response) {
                if (response.status === 401) {
                    console.log('Response 401');
                }

                return response || $q.when(response);
            },
            responseError: function (rejection) {
                if (rejection.status === 401) {
                    // TODO check challange header. If www-Authenticate, send event
                    // Send event for unauthorized so that app can handle this
                    // provide resource that sends 401 based on declared endpoint mapping
                    var resource = adalRef.getResourceForEndpoint(rejection.config.url);
                    adalRef.clearCacheForResource(resource);
                    $rootScope.$broadcast('adal:notAuthorized', rejection, resource);
                }

                return $q.reject(rejection);
            }
        };
    }]);

    // Service that is accessible at config to init and controllers to use API methods
    AdalModule.provider('adalAuthenticationService', function () {
        var _adal = null;
        var _oauthData = { isAuthenticated: false, userName: '', loginError: '' };
        var _profile = { userName: '' };
        var updateDataFromCache = function (resource) {
            // only cache lookup here to not interrupt with events
            var token = _adal.getCachedToken(resource);
            _oauthData.isAuthenticated = token != null && token.length > 0;
            _oauthData.userName = _adal.getCachedUser();
            _oauthData.loginError = _adal.getLoginError();
        };
        var loginProgress = false;

        // methods exposed with 'this' available from config method in the Angular app
        this.init = function (configOptions, httpProvider) {
            if (typeof configOptions != 'undefined') {
                // redirect and logout_redirect are set to current location by default
                configOptions.redirect_uri = configOptions.redirect_uri || window.location.href;
                configOptions.post_logout_redirect_uri = configOptions.post_logout_redirect_uri || window.location.href;

                if (httpProvider && httpProvider.interceptors) {
                    httpProvider.interceptors.push('ProtectedResourceInterceptor');
                }

                // create instance with given config
                _adal = new AuthenticationContext(configOptions);
            } else {
                throw new Error('You must set configOptions, when calling init');
            }

            updateDataFromCache(_adal.config.loginResource);
        };

        // Controller related methods exposed with $get
        this.$get = function ($rootScope, $window, $http, $q, $location, $timeout) {

            // Route change event tracking to receive fragment and also auto renew tokens
            $rootScope.$on('$routeChangeStart', function (e, nextRoute) {
                if (nextRoute.$$route && nextRoute.$$route.requireADLogin) {
                    if (!_oauthData.isAuthenticated && !_oauthData.userName) {
                        console.log("Route change event for:" + nextRoute.$$route.originalPath);
                        if (_adal.config && _adal.config.localLoginUrl) {
                            $location.path(_adal.config.localLoginUrl);
                        } else {
                            // directly start login flow
                            _adal._saveItem(CONSTANTS.STORAGE.START_PAGE, nextRoute.$$route.originalPath);
                            console.log("Start login at:" + window.location.href);
                            _adal.login();
                        }
                    }
                }
            });

            $rootScope.$on('$locationChangeStart', function (event, newUrl, oldUrl) {
                var hash = $window.location.hash;
                console.log("Location change event newurl:" + newUrl);

                if (_adal.isCallback(hash)) {
                    // callback can come from login or iframe request
                    console.log('waiting callback:' + hash);

                    var requestInfo = _adal.getRequestInfo(hash);
                    _adal.saveTokenFromHash(requestInfo);
                    $window.location.hash = '';

                    if (requestInfo.requestType != REQUEST_TYPE.LOGIN) {
                        _adal.callback = $window.parent.AuthenticationContext().callback;
                    }

                    // Return to callback if it is send from iframe
                    if (requestInfo.stateMatch) {
                        if (typeof _adal.callback === 'function') {
                            // Call within the same context without full page redirect keeps the callback
                            if (requestInfo.requestType == REQUEST_TYPE.RENEW_TOKEN) {
                                _adal.callback(_adal._getItem(CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters['access_token']);
                                return;
                            } else if (requestInfo.requestType == REQUEST_TYPE.ID_TOKEN) {
                                _adal.callback(_adal._getItem(CONSTANTS.STORAGE.ERROR_DESCRIPTION), _adal._getItem(CONSTANTS.STORAGE.USERNAME));
                                return;
                            }
                        } else {
                            // normal full login redirect happened on the page
                            updateDataFromCache(_adal.config.loginResource);
                            var token = _adal.getCachedToken(_adal.config.loginResource);
                            if (token != null && token.length > 0) {
                                _adal.getUser(function (error, userName) {
                                    _oauthData.userName = userName;
                                    _oauthData.isAuthenticated = true;

                                    // redirect to login requested page
                                    var loginStartPage = _adal._getItem(CONSTANTS.STORAGE.START_PAGE);
                                    if (loginStartPage) {
                                        console.log("move to page:" + loginStartPage);
                                        $location.path(loginStartPage);                     
                                    }

                                    $timeout(function () {
                                        $rootScope.userInfo = _oauthData;
                                    }, 1);

                                    $rootScope.$broadcast('adal:loginSuccess');
                                });
                            } else {
                                $rootScope.$broadcast('adal:loginFailure', _adal._getItem(CONSTANTS.STORAGE.ERROR_DESCRIPTION));
                            }
                        }
                    }
                } else {
                    // No callback. App resumes after closing or moving to new page.
                    // Check token and username                    
                    if (!_oauthData.isAuthenticated && _oauthData.userName) {
                        if (!_adal._getItem(CONSTANTS.STORAGE.FAILED_RENEW)) {
                            _adal.acquireToken(_adal.config.loginResource, function (error, tokenOut) {
                                if (error) {
                                    $rootScope.$broadcast("adal:loginFailure", "auto renew failure");
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
            });

            updateDataFromCache(_adal.config.loginResource);
            $rootScope.userInfo = _oauthData;

            return {

                // public methods will be here that are accessible from Controller
                config: _adal.config,
                login: function () {
                    _adal.login();
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
                            logStatus('err :' + error);
                            deferred.reject(error);
                        } else {
                            if (tokenOut) {
                                $rootScope.$broadcast('adal:authorized', tokenOut);
                            }
                            deferred.resolve(tokenOut);
                        }
                    });

                    return deferred.promise;
                },
                clearCache: function () {
                    _adal.clearCache();
                }
            }
        };
    });
} else {
    console.log('Angular.JS is not included');
}

// ============= Angular modules- End =============

function supportsLocalStorage() {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        return false;
    }
};