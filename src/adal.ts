    
        AuthenticationContext.prototype._handlePopupError = function (loginCallback, resource, error, errorDesc, loginError) {
            this.warn(errorDesc);
            this._saveItem(this.CONSTANTS.STORAGE.ERROR, error);
            this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, errorDesc);
            this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, loginError);
    
            if (resource && this._activeRenewals[resource]) {
                this._activeRenewals[resource] = null;
            }
    
            this._loginInProgress = false;
            this._acquireTokenInProgress = false;
    
            if (loginCallback) {
                loginCallback(errorDesc, null, error);
            }
        }
    
        /**
         * After authorization, the user will be sent to your specified redirect_uri with the user's bearer token
         * attached to the URI fragment as an id_token field. It closes popup window after redirection.
         * @ignore
         */
        AuthenticationContext.prototype._loginPopup = function (urlNavigate, resource, callback) {
            var popupWindow = this._openPopup(urlNavigate, "login", this.CONSTANTS.POPUP_WIDTH, this.CONSTANTS.POPUP_HEIGHT);
            var loginCallback = callback || this.callback;
    
            if (popupWindow == null) {
                var error = 'Error opening popup';
                var errorDesc = 'Popup Window is null. This can happen if you are using IE';
                this._handlePopupError(loginCallback, resource, error, errorDesc, errorDesc);
                return;
            }
    
            this._openedWindows.push(popupWindow);
    
            if (this.config.redirectUri.indexOf('#') != -1) {
                var registeredRedirectUri = this.config.redirectUri.split("#")[0];
            }
    
            else {
                var registeredRedirectUri = this.config.redirectUri;
            }
    
            var that = this;
    
            var pollTimer = window.setInterval(function () {
                if (!popupWindow || popupWindow.closed || popupWindow.closed === undefined) {
                    var error = 'Popup Window closed';
                    var errorDesc = 'Popup Window closed by UI action/ Popup Window handle destroyed due to cross zone navigation in IE/Edge'
    
                    if (that.isAngular) {
                        that._broadcast('adal:popUpClosed', errorDesc + that.CONSTANTS.RESOURCE_DELIMETER + error);
                    }
    
                    that._handlePopupError(loginCallback, resource, error, errorDesc, errorDesc);
                    window.clearInterval(pollTimer);
                    return;
                }
                try {
                    var popUpWindowLocation = popupWindow.location;
                    if (encodeURI(popUpWindowLocation.href).indexOf(encodeURI(registeredRedirectUri)) != -1) {
                        if (that.isAngular) {
                            that._broadcast('adal:popUpHashChanged', popUpWindowLocation.hash);
                        }
                        else {
                            that.handleWindowCallback(popUpWindowLocation.hash);
                        }
    
                        window.clearInterval(pollTimer);
                        that._loginInProgress = false;
                        that._acquireTokenInProgress = false;
                        that.info("Closing popup window");
                        that._openedWindows = [];
                        popupWindow.close();
                        return;
                    }
                } catch (e) {
                }
            }, 1);
        };
    
        AuthenticationContext.prototype._broadcast = function (eventName, data) {
            // Custom Event is not supported in IE, below IIFE will polyfill the CustomEvent() constructor functionality in Internet Explorer 9 and higher
            (function () {
    
                if (typeof window.CustomEvent === "function") {
                    return false;
                }
    
                function CustomEvent(event, params) {
                    params = params || { bubbles: false, cancelable: false, detail: undefined };
                    var evt = document.createEvent('CustomEvent');
                    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
                    return evt;
                }
    
                CustomEvent.prototype = window.Event.prototype;
                window.CustomEvent = CustomEvent;
            })();
    
            var evt = new CustomEvent(eventName, { detail: data });
            window.dispatchEvent(evt);
        };
    
        /**
         * Checks for the resource in the cache. By default, cache location is Session Storage
         * @ignore
         * @returns {Boolean} 'true' if login is in progress, else returns 'false'.
         */
        AuthenticationContext.prototype._hasResource = function (key) {
            var keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS);
            return keys && !this._isEmpty(keys) && (keys.indexOf(key + this.CONSTANTS.RESOURCE_DELIMETER) > -1);
        };
    
        /**
         * Gets token for the specified resource from the cache.
         * @param {string}   resource A URI that identifies the resource for which the token is requested.
         * @returns {string} token if if it exists and not expired, otherwise null.
         */
        AuthenticationContext.prototype.getCachedToken = function (resource) {
            if (!this._hasResource(resource)) {
                return null;
            }
    
            var token = this._getItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource);
            var expiry = this._getItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource);
    
            // If expiration is within offset, it will force renew
            var offset = this.config.expireOffsetSeconds || 300;
    
            if (expiry && (expiry > this._now() + offset)) {
                return token;
            } else {
                this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, '');
                this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, 0);
                return null;
            }
        };
    
        /**
        * User information from idtoken.
        *  @class User
        *  @property {string} userName - username assigned from upn or email.
        *  @property {object} profile - properties parsed from idtoken.
        */
    
        /**
         * If user object exists, returns it. Else creates a new user object by decoding id_token from the cache.
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
    
        /**
         * Adds the passed callback to the array of callbacks for the specified resource and puts the array on the window object. 
         * @param {string}   resource A URI that identifies the resource for which the token is requested.
         * @param {string}   expectedState A unique identifier (guid).
         * @param {tokenCallback} callback - The callback provided by the caller. It will be called with token or error.
         */
        AuthenticationContext.prototype.registerCallback = function (expectedState, resource, callback) {
            this._activeRenewals[resource] = expectedState;
    
            if (!this._callBacksMappedToRenewStates[expectedState]) {
                this._callBacksMappedToRenewStates[expectedState] = [];
            }
    
            var self = this;
            this._callBacksMappedToRenewStates[expectedState].push(callback);
    
            if (!this._callBackMappedToRenewStates[expectedState]) {
                this._callBackMappedToRenewStates[expectedState] = function (errorDesc, token, error, tokenType) {
                    self._activeRenewals[resource] = null;
    
                    for (var i = 0; i < self._callBacksMappedToRenewStates[expectedState].length; ++i) {
                        try {
                            self._callBacksMappedToRenewStates[expectedState][i](errorDesc, token, error, tokenType);
                        }
                        catch (error) {
                            self.warn(error);
                        }
                    }
    
                    self._callBacksMappedToRenewStates[expectedState] = null;
                    self._callBackMappedToRenewStates[expectedState] = null;
                };
            }
        };
    
        // var errorResponse = {error:'', error_description:''};
        // var token = 'string token';
        // callback(errorResponse, token)
        // with callback
        /**
         * Acquires access token with hidden iframe
         * @ignore
         */
        AuthenticationContext.prototype._renewToken = function (resource, callback, responseType) {
            // use iframe to try refresh token
            // use given resource to create new authz url
            this.info('renewToken is called for resource:' + resource);
            var frameHandle = this._addAdalFrame('adalRenewFrame' + resource);
            var expectedState = this._guid() + '|' + resource;
            this.config.state = expectedState;
            // renew happens in iframe, so it keeps javascript context
            this._renewStates.push(expectedState);
            this.verbose('Renew token Expected state: ' + expectedState);
            // remove the existing prompt=... query parameter and add prompt=none
            responseType = responseType || 'token';
            var urlNavigate = this._urlRemoveQueryStringParameter(this._getNavigateUrl(responseType, resource), 'prompt');
    
            if (responseType === this.RESPONSE_TYPE.ID_TOKEN_TOKEN) {
                this._idTokenNonce = this._guid();
                this._saveItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN, this._idTokenNonce, true);
                urlNavigate += '&nonce=' + encodeURIComponent(this._idTokenNonce);
            }
    
            urlNavigate = urlNavigate + '&prompt=none';
            urlNavigate = this._addHintParameters(urlNavigate);
            this.registerCallback(expectedState, resource, callback);
            this.verbose('Navigate to:' + urlNavigate);
            frameHandle.src = 'about:blank';
            this._loadFrameTimeout(urlNavigate, 'adalRenewFrame' + resource, resource);
    
        };
    
        /**
         * Renews idtoken for app's own backend when resource is clientId and calls the callback with token/error
         * @ignore
         */
        AuthenticationContext.prototype._renewIdToken = function (callback, responseType) {
            // use iframe to try refresh token
            this.info('renewIdToken is called');
            var frameHandle = this._addAdalFrame('adalIdTokenFrame');
            var expectedState = this._guid() + '|' + this.config.clientId;
            this._idTokenNonce = this._guid();
            this._saveItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN, this._idTokenNonce, true);
            this.config.state = expectedState;
            // renew happens in iframe, so it keeps javascript context
            this._renewStates.push(expectedState);
            this.verbose('Renew Idtoken Expected state: ' + expectedState);
            // remove the existing prompt=... query parameter and add prompt=none
            var resource = responseType === null || typeof (responseType) === "undefined" ? null : this.config.clientId;
            var responseType = responseType || 'id_token';
            var urlNavigate = this._urlRemoveQueryStringParameter(this._getNavigateUrl(responseType, resource), 'prompt');
            urlNavigate = urlNavigate + '&prompt=none';
            urlNavigate = this._addHintParameters(urlNavigate);
            urlNavigate += '&nonce=' + encodeURIComponent(this._idTokenNonce);
            this.registerCallback(expectedState, this.config.clientId, callback);
            this.verbose('Navigate to:' + urlNavigate);
            frameHandle.src = 'about:blank';
            this._loadFrameTimeout(urlNavigate, 'adalIdTokenFrame', this.config.clientId);
        };
      
        // Calling _loadFrame but with a timeout to signal failure in loadframeStatus. Callbacks are left
        // registered when network errors occur and subsequent token requests for same resource are registered to the pending request
        /**
         * @ignore
         */
        AuthenticationContext.prototype._loadFrameTimeout = function (urlNavigation, frameName, resource) {
            //set iframe session to pending
            this.verbose('Set loading state to pending for: ' + resource);
            this._saveItem(this.CONSTANTS.STORAGE.RENEW_STATUS + resource, this.CONSTANTS.TOKEN_RENEW_STATUS_IN_PROGRESS);
            this._loadFrame(urlNavigation, frameName);
            var self = this;
    
            setTimeout(function () {
                if (self._getItem(self.CONSTANTS.STORAGE.RENEW_STATUS + resource) === self.CONSTANTS.TOKEN_RENEW_STATUS_IN_PROGRESS) {
                    // fail the iframe session if it's in pending state
                    self.verbose('Loading frame has timed out after: ' + (self.CONSTANTS.LOADFRAME_TIMEOUT / 1000) + ' seconds for resource ' + resource);
                    var expectedState = self._activeRenewals[resource];
    
                    if (expectedState && self._callBackMappedToRenewStates[expectedState]) {
                        self._callBackMappedToRenewStates[expectedState]('Token renewal operation failed due to timeout', null, 'Token Renewal Failed');
                    }
    
                    self._saveItem(self.CONSTANTS.STORAGE.RENEW_STATUS + resource, self.CONSTANTS.TOKEN_RENEW_STATUS_CANCELED);
                }
            }, self.CONSTANTS.LOADFRAME_TIMEOUT);
        }
    
        /**
         * @callback tokenCallback
         * @param {string} error_description error description returned from AAD if token request fails.
         * @param {string} token token returned from AAD if token request is successful.
         * @param {string} error error message returned from AAD if token request fails.
         */
    
        /**
         * Acquires token from the cache if it is not expired. Otherwise sends request to AAD to obtain a new token.
         * @param {string}   resource  ResourceUri identifying the target resource
         * @param {tokenCallback} callback -  The callback provided by the caller. It will be called with token or error.
         */
        AuthenticationContext.prototype.acquireToken = function (resource, callback) {
            if (this._isEmpty(resource)) {
                this.warn('resource is required');
                callback('resource is required', null, 'resource is required');
                return;
            }
    
            var token = this.getCachedToken(resource);
    
            if (token) {
                this.info('Token is already in cache for resource:' + resource);
                callback(null, token, null);
                return;
            }
    
            if (!this._user && !(this.config.extraQueryParameter && this.config.extraQueryParameter.indexOf('login_hint') !== -1)) {
                this.warn('User login is required');
                callback('User login is required', null, 'login required');
                return;
            }
    
            // refresh attept with iframe
            //Already renewing for this resource, callback when we get the token.
            if (this._activeRenewals[resource]) {
                //Active renewals contains the state for each renewal.
                this.registerCallback(this._activeRenewals[resource], resource, callback);
            }
            else {
                this._requestType = this.REQUEST_TYPE.RENEW_TOKEN;
                if (resource === this.config.clientId) {
                    // App uses idtoken to send to api endpoints
                    // Default resource is tracked as clientid to store this token
                    if (this._user) {
                        this.verbose('renewing idtoken');
                        this._renewIdToken(callback);
                    }
                    else {
                        this.verbose('renewing idtoken and access_token');
                        this._renewIdToken(callback, this.RESPONSE_TYPE.ID_TOKEN_TOKEN);
                    }
                } else {
                    if (this._user) {
                        this.verbose('renewing access_token');
                        this._renewToken(resource, callback);
                    }
                    else {
                        this.verbose('renewing idtoken and access_token');
                        this._renewToken(resource, callback, this.RESPONSE_TYPE.ID_TOKEN_TOKEN);
                    }
                }
            }
        };
    
      /**
      * Acquires token (interactive flow using a popUp window) by sending request to AAD to obtain a new token.
      * @param {string}   resource  ResourceUri identifying the target resource
      * @param {string}   extraQueryParameters  extraQueryParameters to add to the authentication request
      * @param {tokenCallback} callback -  The callback provided by the caller. It will be called with token or error.
      */
        AuthenticationContext.prototype.acquireTokenPopup = function (resource, extraQueryParameters, claims, callback) {
            if (this._isEmpty(resource)) {
                this.warn('resource is required');
                callback('resource is required', null, 'resource is required');
                return;
            }
    
            if (!this._user) {
                this.warn('User login is required');
                callback('User login is required', null, 'login required');
                return;
            }
    
            if (this._acquireTokenInProgress) {
                this.warn("Acquire token interactive is already in progress")
                callback("Acquire token interactive is already in progress", null, "Acquire token interactive is already in progress");
                return;
            }
    
            var expectedState = this._guid() + '|' + resource;
            this.config.state = expectedState;
            this._renewStates.push(expectedState);
            this._requestType = this.REQUEST_TYPE.RENEW_TOKEN;
            this.verbose('Renew token Expected state: ' + expectedState);
            // remove the existing prompt=... query parameter and add prompt=select_account
            var urlNavigate = this._urlRemoveQueryStringParameter(this._getNavigateUrl('token', resource), 'prompt');
            urlNavigate = urlNavigate + '&prompt=select_account';
    
            if (extraQueryParameters) {
                urlNavigate += extraQueryParameters;
            }
    
            if (claims && (urlNavigate.indexOf("&claims") === -1)) {
                urlNavigate += '&claims=' + encodeURIComponent(claims);
            }
            else if (claims && (urlNavigate.indexOf("&claims") !== -1)) {
                throw new Error('Claims cannot be passed as an extraQueryParameter');
            }
    
            urlNavigate = this._addHintParameters(urlNavigate);
            this._acquireTokenInProgress = true;
            this.info('acquireToken interactive is called for the resource ' + resource);
            this.registerCallback(expectedState, resource, callback);
            this._loginPopup(urlNavigate, resource, callback);
    
        };
    
        /**
          * Acquires token (interactive flow using a redirect) by sending request to AAD to obtain a new token. In this case the callback passed in the Authentication
          * request constructor will be called.
          * @param {string}   resource  ResourceUri identifying the target resource
          * @param {string}   extraQueryParameters  extraQueryParameters to add to the authentication request
          */
        AuthenticationContext.prototype.acquireTokenRedirect = function (resource, extraQueryParameters, claims) {
            if (this._isEmpty(resource)) {
                this.warn('resource is required');
                callback('resource is required', null, 'resource is required');
                return;
            }
    
            var callback = this.callback;
    
            if (!this._user) {
                this.warn('User login is required');
                callback('User login is required', null, 'login required');
                return;
            }
    
            if (this._acquireTokenInProgress) {
                this.warn("Acquire token interactive is already in progress")
                callback("Acquire token interactive is already in progress", null, "Acquire token interactive is already in progress");
                return;
            }
    
            var expectedState = this._guid() + '|' + resource;
            this.config.state = expectedState;
            this.verbose('Renew token Expected state: ' + expectedState);
    
            // remove the existing prompt=... query parameter and add prompt=select_account
            var urlNavigate = this._urlRemoveQueryStringParameter(this._getNavigateUrl('token', resource), 'prompt');
            urlNavigate = urlNavigate + '&prompt=select_account';
            if (extraQueryParameters) {
                urlNavigate += extraQueryParameters;
            }
    
            if (claims && (urlNavigate.indexOf("&claims") === -1)) {
                urlNavigate += '&claims=' + encodeURIComponent(claims);
            }
            else if (claims && (urlNavigate.indexOf("&claims") !== -1)) {
                throw new Error('Claims cannot be passed as an extraQueryParameter');
            }
    
            urlNavigate = this._addHintParameters(urlNavigate);
            this._acquireTokenInProgress = true;
            this.info('acquireToken interactive is called for the resource ' + resource);
            this._saveItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST, window.location.href);
            this._saveItem(this.CONSTANTS.STORAGE.STATE_RENEW, expectedState, true);
            this.promptUser(urlNavigate);
        };
    
        /**
         * Clears cache items.
         */
        AuthenticationContext.prototype.clearCache = function () {
            this._saveItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST, '');
            this._saveItem(this.CONSTANTS.STORAGE.ANGULAR_LOGIN_REQUEST, '');
            this._saveItem(this.CONSTANTS.STORAGE.SESSION_STATE, '');
            this._saveItem(this.CONSTANTS.STORAGE.STATE_LOGIN, '');
            this._saveItem(this.CONSTANTS.STORAGE.STATE_RENEW, '');
            this._renewStates = [];
            this._saveItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN, '');
            this._saveItem(this.CONSTANTS.STORAGE.IDTOKEN, '');
            this._saveItem(this.CONSTANTS.STORAGE.ERROR, '');
            this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');
            this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, '');
            this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, '');
            var keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS);
    
            if (!this._isEmpty(keys)) {
                keys = keys.split(this.CONSTANTS.RESOURCE_DELIMETER);
                for (var i = 0; i < keys.length && keys[i] !== ""; i++) {
                    this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + keys[i], '');
                    this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + keys[i], 0);
                }
            }
    
            this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, '');
        };
    
        /**
         * Clears cache items for a given resource.
         * @param {string}  resource a URI that identifies the resource.
         */
        AuthenticationContext.prototype.clearCacheForResource = function (resource) {
            this._saveItem(this.CONSTANTS.STORAGE.STATE_RENEW, '');
            this._saveItem(this.CONSTANTS.STORAGE.ERROR, '');
            this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');
    
            if (this._hasResource(resource)) {
                this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, '');
                this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, 0);
            }
        };
    
        /**
         * Redirects user to logout endpoint.
         * After logout, it will redirect to postLogoutRedirectUri if added as a property on the config object.
         */
        AuthenticationContext.prototype.logOut = function () {
            this.clearCache();
            this._user = null;
            var urlNavigate;
    
            if (this.config.logOutUri) {
                urlNavigate = this.config.logOutUri;
            } else {
                var tenant = 'common';
                var logout = '';
    
                if (this.config.tenant) {
                    tenant = this.config.tenant;
                }
    
                if (this.config.postLogoutRedirectUri) {
                    logout = 'post_logout_redirect_uri=' + encodeURIComponent(this.config.postLogoutRedirectUri);
                }
    
                urlNavigate = this.instance + tenant + '/oauth2/logout?' + logout;
            }
    
            this.info('Logout navigate to: ' + urlNavigate);
            this.promptUser(urlNavigate);
        };
    
        /**
         * @callback userCallback
         * @param {string} error error message if user info is not available.
         * @param {User} user user object retrieved from the cache.
         */
    
        /**
         * Calls the passed in callback with the user object or error message related to the user.
         * @param {userCallback} callback - The callback provided by the caller. It will be called with user or error.
         */
        AuthenticationContext.prototype.getUser = function (callback) {
            // IDToken is first call
            if (typeof callback !== 'function') {
                throw new Error('callback is not a function');
            }
    
            // user in memory
            if (this._user) {
                callback(null, this._user);
                return;
            }
    
            // frame is used to get idtoken
            var idtoken = this._getItem(this.CONSTANTS.STORAGE.IDTOKEN);
    
            if (!this._isEmpty(idtoken)) {
                this.info('User exists in cache: ');
                this._user = this._createUser(idtoken);
                callback(null, this._user);
            } else {
                this.warn('User information is not available');
                callback('User information is not available', null);
            }
        };
    
        /**
         * Adds login_hint to authorization URL which is used to pre-fill the username field of sign in page for the user if known ahead of time.
         * domain_hint can be one of users/organisations which when added skips the email based discovery process of the user.
         * @ignore
         */
        AuthenticationContext.prototype._addHintParameters = function (urlNavigate) {
            // include hint params only if upn is present
            if (this._user && this._user.profile && this._user.profile.hasOwnProperty('upn')) {
    
                // don't add login_hint twice if user provided it in the extraQueryParameter value
                if (!this._urlContainsQueryStringParameter("login_hint", urlNavigate)) {
                    // add login_hint
                    urlNavigate += '&login_hint=' + encodeURIComponent(this._user.profile.upn);
                }
    
                // don't add domain_hint twice if user provided it in the extraQueryParameter value
                if (!this._urlContainsQueryStringParameter("domain_hint", urlNavigate) && this._user.profile.upn.indexOf('@') > -1) {
                    var parts = this._user.profile.upn.split('@');
                    // local part can include @ in quotes. Sending last part handles that.
                    urlNavigate += '&domain_hint=' + encodeURIComponent(parts[parts.length - 1]);
                }
            }
    
            return urlNavigate;
        }
    
        /**
         * Gets login error
         * @returns {string} error message related to login.
         */
        AuthenticationContext.prototype.getLoginError = function () {
            return this._getItem(this.CONSTANTS.STORAGE.LOGIN_ERROR);
        };
        
        /**
        * Matches nonce from the request with the response.
        * @ignore
        */
        AuthenticationContext.prototype._matchNonce = function (user) {
            var requestNonce = this._getItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN);
    
            if (requestNonce) {
                requestNonce = requestNonce.split(this.CONSTANTS.CACHE_DELIMETER);
                for (var i = 0; i < requestNonce.length; i++) {
                    if (requestNonce[i] === user.profile.nonce) {
                        return true;
                    }
                }
            }
    
            return false;
        };
    
        /**
        * Matches state from the request with the response.
        * @ignore
        */
        AuthenticationContext.prototype._matchState = function (requestInfo) {
            var loginStates = this._getItem(this.CONSTANTS.STORAGE.STATE_LOGIN);
    
            if (loginStates) {
                loginStates = loginStates.split(this.CONSTANTS.CACHE_DELIMETER);
                for (var i = 0; i < loginStates.length; i++) {
                    if (loginStates[i] === requestInfo.stateResponse) {
                        requestInfo.requestType = this.REQUEST_TYPE.LOGIN;
                        requestInfo.stateMatch = true;
                        return true;
                    }
                }
            }
    
            var acquireTokenStates = this._getItem(this.CONSTANTS.STORAGE.STATE_RENEW);
    
            if (acquireTokenStates) {
                acquireTokenStates = acquireTokenStates.split(this.CONSTANTS.CACHE_DELIMETER);
                for (var i = 0; i < acquireTokenStates.length; i++) {
                    if (acquireTokenStates[i] === requestInfo.stateResponse) {
                        requestInfo.requestType = this.REQUEST_TYPE.RENEW_TOKEN;
                        requestInfo.stateMatch = true;
                        return true;
                    }
                }
            }
    
            return false;
    
        };
    
        /**
         * Extracts resource value from state.
         * @ignore
         */
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
         * Saves token or error received in the response from AAD in the cache. In case of id_token, it also creates the user object.
         */
        AuthenticationContext.prototype.saveTokenFromHash = function (requestInfo) {
            this.info('State status:' + requestInfo.stateMatch + '; Request type:' + requestInfo.requestType);
            this._saveItem(this.CONSTANTS.STORAGE.ERROR, '');
            this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');
    
            var resource = this._getResourceFromState(requestInfo.stateResponse);
    
            // Record error
            if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ERROR_DESCRIPTION)) {
                this.info('Error :' + requestInfo.parameters.error + '; Error description:' + requestInfo.parameters[this.CONSTANTS.ERROR_DESCRIPTION]);
                this._saveItem(this.CONSTANTS.STORAGE.ERROR, requestInfo.parameters.error);
                this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, requestInfo.parameters[this.CONSTANTS.ERROR_DESCRIPTION]);
    
                if (requestInfo.requestType === this.REQUEST_TYPE.LOGIN) {
                    this._loginInProgress = false;
                    this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, requestInfo.parameters.error_description);
                }
            } else {
                // It must verify the state from redirect
                if (requestInfo.stateMatch) {
                    // record tokens to storage if exists
                    this.info('State is right');
                    if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.SESSION_STATE)) {
                        this._saveItem(this.CONSTANTS.STORAGE.SESSION_STATE, requestInfo.parameters[this.CONSTANTS.SESSION_STATE]);
                    }
    
                    var keys;
    
                    if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN)) {
                        this.info('Fragment has access token');
    
                        if (!this._hasResource(resource)) {
                            keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS) || '';
                            this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, keys + resource + this.CONSTANTS.RESOURCE_DELIMETER);
                        }
    
                        // save token with related resource
                        this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, requestInfo.parameters[this.CONSTANTS.ACCESS_TOKEN]);
                        this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, this._expiresIn(requestInfo.parameters[this.CONSTANTS.EXPIRES_IN]));
                    }
    
                    if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ID_TOKEN)) {
                        this.info('Fragment has id token');
                        this._loginInProgress = false;
                        this._user = this._createUser(requestInfo.parameters[this.CONSTANTS.ID_TOKEN]);
                        if (this._user && this._user.profile) {
                            if (!this._matchNonce(this._user)) {
                                this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, 'Nonce received: ' + this._user.profile.nonce + ' is not same as requested: ' +
                                   this._getItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN));
                                this._user = null;
                            } else {
                                this._saveItem(this.CONSTANTS.STORAGE.IDTOKEN, requestInfo.parameters[this.CONSTANTS.ID_TOKEN]);
    
                                // Save idtoken as access token for app itself
                                resource = this.config.loginResource ? this.config.loginResource : this.config.clientId;
    
                                if (!this._hasResource(resource)) {
                                    keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS) || '';
                                    this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, keys + resource + this.CONSTANTS.RESOURCE_DELIMETER);
                                }
    
                                this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, requestInfo.parameters[this.CONSTANTS.ID_TOKEN]);
                                this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, this._user.profile.exp);
                            }
                        }
                        else {
                            requestInfo.parameters['error'] = 'invalid id_token';
                            requestInfo.parameters['error_description'] = 'Invalid id_token. id_token: ' + requestInfo.parameters[this.CONSTANTS.ID_TOKEN];
                            this._saveItem(this.CONSTANTS.STORAGE.ERROR, 'invalid id_token');
                            this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, 'Invalid id_token. id_token: ' + requestInfo.parameters[this.CONSTANTS.ID_TOKEN]);
                        }
                    }
                } else {
                    requestInfo.parameters['error'] = 'Invalid_state';
                    requestInfo.parameters['error_description'] = 'Invalid_state. state: ' + requestInfo.stateResponse;
                    this._saveItem(this.CONSTANTS.STORAGE.ERROR, 'Invalid_state');
                    this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, 'Invalid_state. state: ' + requestInfo.stateResponse);
                }
            }
    
            this._saveItem(this.CONSTANTS.STORAGE.RENEW_STATUS + resource, this.CONSTANTS.TOKEN_RENEW_STATUS_COMPLETED);
        };
    
        /**
         * Gets resource for given endpoint if mapping is provided with config.
         * @param {string} endpoint  -  The URI for which the resource Id is requested.
         * @returns {string} resource for this API endpoint.
         */
        AuthenticationContext.prototype.getResourceForEndpoint = function (endpoint) {
    
            // if user specified list of anonymous endpoints, no need to send token to these endpoints, return null.
            if (this.config && this.config.anonymousEndpoints) {
                for (var i = 0; i < this.config.anonymousEndpoints.length; i++) {
                    if (endpoint.indexOf(this.config.anonymousEndpoints[i]) > -1) {
                        return null;
                    }
                }
            }
    
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
            // check if it's staring from http or https, needs to match with app host
            if (endpoint.indexOf('http://') > -1 || endpoint.indexOf('https://') > -1) {
                if (this._getHostFromUri(endpoint) === this._getHostFromUri(this.config.redirectUri)) {
                    return this.config.loginResource;
                }
            }
            else {
                // in angular level, the url for $http interceptor call could be relative url,
                // if it's relative call, we'll treat it as app backend call.            
                return this.config.loginResource;
            }
    
            // if not the app's own backend or not a domain listed in the endpoints structure
            return null;
        };
    
        /**
         * Strips the protocol part of the URL and returns it.
         * @ignore
         */
        AuthenticationContext.prototype._getHostFromUri = function (uri) {
            // remove http:// or https:// from uri
            var extractedUri = String(uri).replace(/^(https?:)\/\//, '');
            extractedUri = extractedUri.split('/')[0];
            return extractedUri;
        };
    
        /**
         * This method must be called for processing the response received from AAD. It extracts the hash, processes the token or error, saves it in the cache and calls the registered callbacks with the result.
         * @param {string} [hash=window.location.hash] - Hash fragment of Url.
         */
        AuthenticationContext.prototype.handleWindowCallback = function (hash) {
            // This is for regular javascript usage for redirect handling
            // need to make sure this is for callback
            if (hash == null) {
                hash = window.location.hash;
            }
    
            if (this.isCallback(hash)) {
                var self = null;
                var isPopup = false;
    
                if (this._openedWindows.length > 0 && this._openedWindows[this._openedWindows.length - 1].opener
                    && this._openedWindows[this._openedWindows.length - 1].opener._adalInstance) {
                    self = this._openedWindows[this._openedWindows.length - 1].opener._adalInstance;
                    isPopup = true;
                }
                else if (window.parent && window.parent._adalInstance) {
                    self = window.parent._adalInstance;
                }
    
                var requestInfo = self.getRequestInfo(hash);
                var token, tokenReceivedCallback, tokenType = null;
    
                if (isPopup || window.parent !== window) {
                    tokenReceivedCallback = self._callBackMappedToRenewStates[requestInfo.stateResponse];
                }
                else {
                    tokenReceivedCallback = self.callback;
                }
    
                self.info("Returned from redirect url");
                self.saveTokenFromHash(requestInfo);
    
                if ((requestInfo.requestType === this.REQUEST_TYPE.RENEW_TOKEN) && window.parent) {
                    if (window.parent !== window) {
                        self.verbose("Window is in iframe, acquiring token silently");
                    } else {
                        self.verbose("acquiring token interactive in progress");
                    }
    
                    token = requestInfo.parameters[self.CONSTANTS.ACCESS_TOKEN] || requestInfo.parameters[self.CONSTANTS.ID_TOKEN];
                    tokenType = self.CONSTANTS.ACCESS_TOKEN;
                } else if (requestInfo.requestType === this.REQUEST_TYPE.LOGIN) {
                    token = requestInfo.parameters[self.CONSTANTS.ID_TOKEN];
                    tokenType = self.CONSTANTS.ID_TOKEN;
                }
    
                var errorDesc = requestInfo.parameters[self.CONSTANTS.ERROR_DESCRIPTION];
                var error = requestInfo.parameters[self.CONSTANTS.ERROR];
                try {
                    if (tokenReceivedCallback) {
                        tokenReceivedCallback(errorDesc, token, error, tokenType);
                    }
    
                } catch (err) {
                    self.error("Error occurred in user defined callback function: " + err);
                }
    
                if (window.parent === window && !isPopup) {
                    window.location.hash = '';
                    if (self.config.navigateToLoginRequestUrl) {
                        window.location.href = self._getItem(self.CONSTANTS.STORAGE.LOGIN_REQUEST);
                    }
                }
            }
        };
    
        /**
         * Constructs the authorization endpoint URL and returns it.
         * @ignore
         */
        AuthenticationContext.prototype._getNavigateUrl = function (responseType, resource) {
            var tenant = 'common';
            if (this.config.tenant) {
                tenant = this.config.tenant;
            }
    
            var urlNavigate = this.instance + tenant + '/oauth2/authorize' + this._serialize(responseType, this.config, resource) + this._addLibMetadata();
            this.info('Navigate url:' + urlNavigate);
            return urlNavigate;
        };
       
        /**
         * Serializes the parameters for the authorization endpoint URL and returns the serialized uri string.
         * @ignore
         */
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
    
                var correlationId = obj.correlationId ? obj.correlationId : this._guid();
                str.push('client-request-id=' + encodeURIComponent(correlationId));
            }
    
            return str.join('&');
        };
              
        /**
         * Returns a cloned copy of the passed object.
         * @ignore
         */
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
    
        /**
         * Returns a reference of Authentication Context as a result of a require call.
         * @ignore
         */
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = AuthenticationContext;
            module.exports.inject = function (conf) {
                return new AuthenticationContext(conf);
            };
        }
    