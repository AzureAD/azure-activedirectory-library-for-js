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

// Concept
// TODO auto renew
// TODO event usage with route
// TODO same page callback for angular
// TODO server api endpoint identifier to place token for different resource
// TODO $routechangestart use to auto renew
// TODO config after login url to open

// TODO move these inside ADAL
var expectedState = "";
var STORAGE_PREFIX = "adal";
var STORAGE_ACCESS_TOKEN_KEY = STORAGE_PREFIX + ".access.token";
var STORAGE_EXPIRATION_KEY = STORAGE_PREFIX + ".expiration";
var STORAGE_START_PAGE = STORAGE_PREFIX + ".start.page";
var STORAGE_FAILED_RENEW = STORAGE_PREFIX + ".failed.renew";
var STORAGE_STATE = STORAGE_PREFIX + ".state";
var STORAGE_SESSION_STATE = STORAGE_PREFIX + ".session.state";
var STORAGE_USERNAME = STORAGE_PREFIX + ".username";
var STORAGE_ERROR = STORAGE_PREFIX + ".error";
var STORAGE_ERROR_DESCRIPTION = STORAGE_PREFIX + ".error.description";
var STORAGE_LOGIN_REQUEST = STORAGE_PREFIX + ".login.request";
var STORAGE_LOGIN_ERROR = STORAGE_PREFIX + ".login.error";
var MSG_RENEW_FAIL = "Token renewable is failed";

// node.js usage for tests
if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = Adal;
    }
    exports.Adal = Adal;
} 

function Adal(config) {
    REQUEST_TYPE = {
        ACCESS_TOKEN: "ACCESS_TOKEN",
        ID_TOKEN: "ID_TOKEN",
        UNKNOWN: "UNKNOWN"
    };

    //TODO supported singleton over JS1.5 check JS version
    // this is not supported in strict mode
    //
    if (arguments.callee._singletonInstance) {
        return arguments.callee._singletonInstance;
    }
    arguments.callee._singletonInstance = this;
    this.endpoint = "https://login.windows.net/";
    this.config = config;
    this.callback = null;
    this.popUp = false;
    this.startPage = null;
    this.user = null;
    this.frameRequestType = REQUEST_TYPE.UNKNOWN;
};

Adal.prototype.ERR_MESSAGES = {
    NO_TOKEN: "User is not authorized"
};

// callback is used if it does not do full page redirect and keeps the JS context
Adal.prototype.login = function (callback) {
    // Token is not present and user needs to login
    expectedState = this._guid();
    this.callback = callback;
    this.config.state = expectedState;
    logStatus("Expected state: " + expectedState + " startPage:" + window.location);
    this._saveItem(STORAGE_LOGIN_REQUEST, window.location);
    this._saveItem(STORAGE_LOGIN_ERROR, "");
    this._saveItem(STORAGE_START_PAGE, window.location);
    this._saveItem(STORAGE_STATE, expectedState);
    this._saveItem(STORAGE_FAILED_RENEW, "");
    this._saveItem(STORAGE_ERROR, "");
    this._saveItem(STORAGE_ERROR_DESCRIPTION, "");

    var urlNavigate = this._getNavigateUrl("token");
    this.frameCallInProgress = false;
    if (this.config.displayCall != 'undefined' && typeof this.config.displayCall == 'function') {
        // User defined way of handling the navigation
        this.config.displayCall(urlNavigate);
    } else {
        this.promptUser(urlNavigate);
    }
    // callback from redirected page will receive fragment. It needs to call oauth2Callback
};

// direct cache lookup
Adal.prototype.getCachedToken = function (resource) {
    // TODO this will use cache key based on resource
    console.log("Resource:" + resource);
    var token = this._getItem(STORAGE_ACCESS_TOKEN_KEY);
    var expired = this._getItem(STORAGE_EXPIRATION_KEY);

    // TODO expire before actual time
    if (expired && expired > this._now()) {
        console.log("Not expired token. Expired:" + expired + " Token:" + token);
        return token;
    } else {
        this._saveItem(STORAGE_ACCESS_TOKEN_KEY, "");
        this._saveItem(STORAGE_EXPIRATION_KEY, 0);
        this._saveItem(STORAGE_USERNAME, "");
        console.log("Expired token. Expired:" + expired + " Token:" + this._now());
        return null;
    }
};

Adal.prototype.getCachedUser = function () {
    return this._getItem(STORAGE_USERNAME);
};

Adal.prototype.setStartPage = function (page) {
    // for test
    this.startPage = page;
};

// var errorResponse = {error:"", error_description:""};
// var token = "string token";
// callback(errorResponse, token)
// with callback
Adal.prototype._renewToken = function (resource, callback) {
    // use iframe to try refresh token
    // use given resource to create new authz url
    logStatus("renewToken is called");
    var frameHandle = addAdalFrame();
    expectedState = this._guid();
    if (typeof resource != 'undefined' && !resource) {
        this.config.resource = resource;
    }
    this.config.state = expectedState;
    this._saveItem(STORAGE_STATE, expectedState);
    this._saveItem(STORAGE_FAILED_RENEW, "");
    this._saveItem(STORAGE_LOGIN_REQUEST, "");
    logStatus("Expected state: " + expectedState);
    var urlNavigate = this._getNavigateUrl("token") + "&prompt=none";
    this.callback = callback;
    this.frameRequestType = REQUEST_TYPE.ACCESS_TOKEN;
    this.idTokenNonce = null;
    logStatus("Navigate to:" + urlNavigate);
    frameHandle.src = urlNavigate;
};

// var errorResponse = {error:"", error_description:""};
// var token = "string token";
// callback(errorResponse, token)
// do all attempts to get a token. It can be called at initializing page.
Adal.prototype.acquireToken = function (resource, callback) {
    var token = this.getCachedToken(resource);
    if (token) {
        logStatus("Token in cache");
        callback(null, token);
        return;
    }

    if (this._getItem(STORAGE_FAILED_RENEW)) {
        logStatus("renewToken is failed:" + this._getItem(STORAGE_FAILED_RENEW));
        callback(this._getItem(STORAGE_FAILED_RENEW), null);
        return;
    }

    // refresh attept with iframe
    this._renewToken(resource, function (refreshErr, refreshedToken) {
        logStatus("renewtoken calls callback refreshErr:" + refreshErr.error_description);
        callback(refreshErr, refreshedToken);
        return;
    });
};

// this will prompt the user and call OauthCallback with fragment
// it is separated so that it can be overwritten
Adal.prototype.promptUser = function (urlNavigate) {
    if (urlNavigate) {
        logStatus("Navigate to:" + urlNavigate);
        window.location.replace(urlNavigate);
    } else {
        logStatus("Navigate url is empty");
    }
};

Adal.prototype.clearCache = function (resource) {
    // TODO clear for multiple resources
    this._saveItem(STORAGE_ACCESS_TOKEN_KEY, "");
    this._saveItem(STORAGE_EXPIRATION_KEY, 0);
    this._saveItem(STORAGE_FAILED_RENEW, "");
    this._saveItem(STORAGE_SESSION_STATE, "");
    this._saveItem(STORAGE_STATE, "");
    this._saveItem(STORAGE_START_PAGE, "");
    this._saveItem(STORAGE_USERNAME, "");
    this._saveItem(STORAGE_ERROR, "");
    this._saveItem(STORAGE_ERROR_DESCRIPTION, "");
};

Adal.prototype.logOut = function () {
    this.clearCache();
    var tenant = "common";
    var logout = "";
    if (this.config.tenant != 'undefined') {
        tenant = this.config.tenant;
    }

    if (this.config.endpoint != 'undefined') {
        this.endpoint = this.config.endpoint;
    }

    if (this.config.post_logout_redirect_uri != 'undefined') {
        logout = "post_logout_redirect_uri=" + this.config.post_logout_redirect_uri;
    }

    var urlNavigate = this.endpoint + tenant + "/oauth2/logout?" + logout;
    logStatus("Logout navigate to: " + urlNavigate);
    this.promptUser(urlNavigate);
};

Adal.prototype._isEmpty = function (str) {
    return (typeof str == 'undefined' || !str || 0 === str.length);
};

// callback(err, result)
Adal.prototype.getUser = function (callback) {
    // get cached token
    var token = this.getCachedToken();
    this.callback = callback;
    if (token) {
        // frame is used to get idtoken
        var userInStorage = this._getItem(STORAGE_USERNAME);
        if (!this._isEmpty(userInStorage)) {
            logStatus("User exists in cache: " + userInStorage);
            this.callback(null, userInStorage);
            return;
        }

        if (this._getItem(STORAGE_FAILED_RENEW)) {
            logStatus("renewToken is failed:" + this._getItem(STORAGE_FAILED_RENEW));
            callback(this._getItem(STORAGE_FAILED_RENEW), null);
            return;
        }

        this._getIdTokenInFrame(callback);
    } else {
        logStatus("User is not authorized");
        callback(this.ERR_MESSAGES.NO_TOKEN, null);
    }
};

Adal.prototype._getIdTokenInFrame = function(callback) {
    expectedState = this._guid();
    this.config.state = expectedState;
    var frameHandle = addAdalFrame();
    logStatus("Expected state: " + expectedState + " start for iframe");

    this._saveItem(STORAGE_START_PAGE, "");
    this._saveItem(STORAGE_STATE, expectedState);
    this._saveItem(STORAGE_USERNAME, "");
    this._saveItem(STORAGE_LOGIN_REQUEST, "");

    // send request in iframe for idtoken
    this._idTokenNonce = this._guid();
    var urlNavigate = this._getNavigateUrl("id_token") + "&prompt=none&nonce=" + this._idTokenNonce;
    this.callback = callback;
    this.frameRequestType = REQUEST_TYPE.ID_TOKEN;
    logStatus("Navigate to:" + urlNavigate);
    frameHandle.src = urlNavigate;
};

Adal.prototype._getHash = function (hash) {
    if (hash.indexOf("#/") > -1) {
        hash = hash.substring(hash.indexOf("#/") + 2);
    } else if (hash.indexOf("#") > -1) {
        hash = hash.substring(1);
    }
    return hash;
}

Adal.prototype.isCallback = function (hash) {
    hash = this._getHash(hash);
    var parameters = this._deserialize(hash);
    var expectedState = this._getItem(STORAGE_STATE);
    return (!this._isEmpty(expectedState) && (
            parameters.hasOwnProperty("error_description") ||
            parameters.hasOwnProperty("access_token") ||
            parameters.hasOwnProperty("id_token")
            ));
};

Adal.prototype.getLoginError = function(){
   return this._getItem(STORAGE_LOGIN_ERROR);
}

Adal.prototype.oauth2Callback = function (hash, iframeRequest) {
    hash = this._getHash(hash);
    var parameters = this._deserialize(hash);
    var errorResponse = null;
    var expectedState = this._getItem(STORAGE_STATE);
    if (!this._isEmpty(expectedState) && (
        parameters.hasOwnProperty("error_description") ||
        parameters.hasOwnProperty("access_token") ||
        parameters.hasOwnProperty("id_token")
        )) {
        this._saveItem(STORAGE_STATE, "");
        logStatus("callback");
    } else {
        logStatus("not callback");
        return;
    }

    if (parameters.hasOwnProperty("error_description")) {
        logStatus("Error :" + parameters.error);
        logStatus("Error description:" + parameters.error_description);
        errorResponse = {
            error: parameters.error,
            error_description: parameters.error_description
        };
        this._saveItem(STORAGE_FAILED_RENEW, "");
        this._saveItem(STORAGE_ERROR, parameters.error);
        this._saveItem(STORAGE_ERROR_DESCRIPTION, parameters.error_description);
        if (iframeRequest) {
            logStatus("Request type is for access token");
            // acquireToken should not repeat iframe renew again
            this._saveItem(STORAGE_FAILED_RENEW, parameters.error_description);
        }

        if (this._getItem(STORAGE_LOGIN_REQUEST)) {
            this._saveItem(STORAGE_LOGIN_ERROR, parameters.error_description);
        }
    }

    if (parameters.hasOwnProperty("state")) {
        logStatus("State: " + parameters.state);
    } else {
        logStatus("No state returned");
    }

    // It must verify the state from redirect
    
    if (expectedState == parameters.state) {
        // record tokens to storage if exists
        logStatus("State is right");
        if (parameters.hasOwnProperty("session_state")) {
            this._saveItem(STORAGE_SESSION_STATE, parameters.session_state);
        }

        if (parameters.hasOwnProperty("access_token")) {
            logStatus("Fragment has access token");
            this._saveItem(STORAGE_ACCESS_TOKEN_KEY, parameters["access_token"]);
            this._saveItem(STORAGE_EXPIRATION_KEY, this._expiresIn(parameters["expires_in"]));
        }

        if (parameters.hasOwnProperty("id_token")) {
            logStatus("Fragment has IdToken");
            this._saveItem(STORAGE_USERNAME, this._extractUserName(parameters.id_token));
        }
    } else {
        if (this._getItem(STORAGE_LOGIN_REQUEST)) {
            this._saveItem(STORAGE_LOGIN_ERROR, "State is not same as " + expectedState);
        }
    }

    this._saveItem(STORAGE_LOGIN_REQUEST, "");

    // Restore state of the app
    if (typeof this.callback === 'function') {
        // Call within the same context without full page redirect keeps the callback
        logStatus("Use callback to return token");
        if (this.frameRequestType == REQUEST_TYPE.ACCESS_TOKEN) {
            this.callback(errorResponse, parameters["access_token"]);
        } else {
            this.callback(errorResponse, this._getItem(STORAGE_USERNAME));
        }
    } else {
        // normal redirect on the page itself happened
        var redirectPage = this._getItem(STORAGE_START_PAGE);
        logStatus("Redirect to " + redirectPage);
        window.location = redirectPage;
    }
};

function handleWindowCallback(hash) {
    // need to make sure this is for callback
    if (window.parent && window.parent.oauth2Callback) {
        // iframe call
        console.log("Window is in iframe");
        window.parent.setTimeout(window.parent.oauth2Callback(hash, true), 1);
        window.src = "";
    } else if (window && window.oauth2Callback) {
        console.log("Window is redirecting");
        window.setTimeout(window.oauth2Callback(hash, false), 1);
    } else if (window && window.opener) {
        console.log("Window is a pop up");
        window.opener.setTimeout(window.opener.oauth2Callback(hash, false), 1);
        window.close();
    };
};

function oauth2Callback(hash, iframeRequest) {
    // Configuration is not important. It will use the saved state and saved last location to handle callback.
    console.log("Saved info from hash");
    var adal = new Adal();
    adal.oauth2Callback(hash, iframeRequest);
};

Adal.prototype._getNavigateUrl = function (responseType) {
    var tenant = "common";
    if (this.config.tenant != 'undefined') {
        tenant = this.config.tenant;
    }

    if (this.config.endpoint != 'undefined') {
        this.endpoint = this.config.endpoint;
    }

    var urlNavigate = this.endpoint + tenant + "/oauth2/authorize" + this._serialize(responseType, this.config);
    console.log("Navigate url:" + urlNavigate);
    return urlNavigate;
};

Adal.prototype._extractUserName = function (encodedIdToken) {
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
        if (parsed.hasOwnProperty("upn")) {
            return parsed.upn;
        } else if (parsed.hasOwnProperty("email")) {
            return parsed.email;
        }
    } catch(err) {
        logStatus('The returned id_token could not be decoded: ' + err.stack);
    }
 
    return null;
};

Adal.prototype._base64DecodeStringUrlSafe = function(base64IdToken) {
    // html5 should support atob function for decoding
    if (window.atob) {
        return atob(base64IdToken);
    }

    // TODO add support for this
    logStatus("Browser is not supported");
    return null;
};

// Adal.node js crack function
Adal.prototype._crackJwt = function (jwtToken) {
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

Adal.prototype._convertUrlSafeToRegularBase64EncodedString = function(str) {
    return str.replace('-', '+').replace('_', '/');
};

Adal.prototype._serialize = function (responseType, obj) {
    var str = [];
    if (obj != null) {
        str.push("?response_type=" + responseType);
        str.push("&client_id=" + encodeURIComponent(obj["client_id"]));
        str.push("&resource=" + encodeURIComponent(obj["resource"]));
        str.push("&redirect_uri=" + encodeURIComponent(obj["redirect_uri"]));
        str.push("&state=" + encodeURIComponent(obj["state"]));
        if (obj.hasOwnProperty("slice")) {
            str.push("&slice=" + encodeURIComponent(obj["slice"]));
        }
    }

    return str.join("&");
};

Adal.prototype._deserialize = function (query) {
    var match,
		pl = /\+/g,  // Regex for replacing addition symbol with a space
		search = /([^&=]+)=?([^&]*)/g,
		decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
		obj = {};
    while (match = search.exec(query)) {
        obj[decode(match[1])] = decode(match[2]);
    }

    return obj;
};

Adal.prototype._guid = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

Adal.prototype._expiresIn = function (expires) {
    return this._now() + parseInt(expires, 10);
};

Adal.prototype._now = function () {
    return Math.round(new Date().getTime() / 1000.0);
};

function addAdalFrame() {
    console.log("Add adal frame to documet");
    var iframeId = "AdalRefreshFrame";
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
            document.body.insertAdjacentHTML('beforeEnd', '<iframe name="' + iframeId + '" id="' + iframeId + '" style="border:1px solid black;display:none"></iframe>');
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

Adal.prototype._saveItem = function (key, obj) {
    if (!supportsLocalStorage()) {
        logStatus("Local storage is not supported");
        return false;
    }

    logStatus("Save item:" + key);
    localStorage.setItem(key, obj);

    return true;
};

Adal.prototype._getItem = function (key) {
    if (!supportsLocalStorage()) {
        logStatus("Local storage is not supported");
        return null;
    }

    return localStorage.getItem(key);
};

// ============= Angular modules- Start =============
if (typeof angular != 'undefined') {

    var AdalModule = angular.module('AdalAngular', []);
    // Interceptor for http if needed
    AdalModule.factory('TokenInterceptor', ['$q', '$rootScope', function ($q, $rootScope) {
        return {
            request: function (config) {
                if (config) {
                    config.headers = config.headers || {};
                    var tokenStored = Adal().getCachedToken();
                    // TODO selective endpoints to add token
                    if (tokenStored) {
                        console.log("Add Cached token to header at request:" + tokenStored);
                        config.headers.Authorization = "Bearer " + tokenStored;
                    }
                }

                return config;
            },
            response: function (response) {
                if (response.status === 401) {
                    console.log("Response 401");
                }

                return response || $q.when(response);
            },
            responseError: function (rejection) {
                console.log("Response Error:", rejection);
                if (rejection.status === 401) {
                    // Send event for unauthorized so that app can handle this
                    // TODO who send this call
                    $rootScope.$broadcast('adal:notauthorized', rejection);
                }

                return $q.reject(rejection);
            }
        };
    }]);

    AdalModule.factory('TokenService', function ($rootScope, $q) {
        var adal = null;

        function init() {
            if (typeof AdalOauthConfig != 'undefined') {
                console.log("AdalOauthConfig is defined");
                // create instance with given config
                adal = new Adal(AdalOauthConfig);
            } else {
                console.log("AdalOauthConfig is not defined");
            }
        }
        

        return {
            // public methods will be here
            login: function () {
                init();
                adal.clearCache();
            },
            login: function () {
                init();
                adal.login();
            },
            logOut: function () {
                init();
                adal.logOut();
                //call signout related method
            },
            getCachedToken: function(resource){
                init();
                var token = adal.getCachedToken(resource);
                return token;
            },
            checkAuthorization: function (resource) {
                init();
                var oauthData = { isAuthorized: false, userName: "", loginError: "" };
                var token = adal.getCachedToken(resource);
                oauthData.isAuthorized = token != null && token.length > 0;
                oauthData.userName = adal.getCachedUser();
                oauthData.loginError = adal.getLoginError();
                return oauthData;
            },
            acquireToken: function (resource) {
                // automated token request call
                init();
                
                var deferred = $q.defer();
                adal.acquireToken(resource, function (error, tokenOut) {
                    if (error) {
                        logStatus("err :" + error);
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
            getUser: function () {
                init();
                var deferred = $q.defer();
                // idtoken call to get info
                adal.getUser(function (error, result) {
                    if (!error) {
                        deferred.resolve(result);
                    } else {
                        deferred.reject(error);
                    }
                });

                return deferred.promise;
            }
        };
    });
} else {
    console.log("Angular.JS is not included");
}

// ============= Angular modules- End =============

function supportsLocalStorage() {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        return false;
    }
}



