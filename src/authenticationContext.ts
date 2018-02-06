import { AdalConfig } from "./adalConfig";
import { User } from "./user";
import { Constants } from "./Constants";
import { RequestType } from "./requestType";
import { ResponseType } from "./responseType";
import { TokenReceivedCallback } from "./tokenReceivedCallback";
import { Utils } from "./Utils";
import { TokenResponse } from "./RequestInfo";

export class AuthenticationContext {
  public instance: string = 'https://login.microsoftonline.com/';
  public config: AdalConfig;
  public callback: TokenReceivedCallback = null;
  public popUp: boolean = false;
  public isAngular: boolean = false;

  private _user : User = null;
  private _activeRenewals = {};
  private _loginInProgress = false;
  private _acquireTokenInProgress = false;
  private _renewStates: any = []; // <==================
  private _callBackMappedToRenewStates = {};
  private _callBacksMappedToRenewStates = {};
  private _openedWindows: any = []; // <=====================
  private _requestType: string = RequestType.LOGIN;
  private _idTokenNonce: string;

  private static _singletonInstance: AuthenticationContext = null;

  //window._adalInstance = this;   //  <===================

  constructor(config: AdalConfig) {
    if (AuthenticationContext._singletonInstance != null)
      return AuthenticationContext._singletonInstance;
    else
      AuthenticationContext._singletonInstance = this;

    // clientId is required
    if (!config.clientId) {
      throw new Error("clientId is required");
    }

    this.config = config; // <============== need deep copy  _cloneConfig

    if (this.config.popUp) {
      this.popUp = true;
    }

    this.callback = this.config.callback;

    if (this.config.instance) {
      this.instance = this.config.instance;
    }

    // App can request idtoken for itself using clientid as resource
    if (!this.config.loginResource) {
      this.config.loginResource = this.config.clientId;
    }

    // redirect and logout_redirect are set to current location by default
    if (!this.config.redirectUri) {
      // strip off query parameters or hashes from the redirect uri as AAD does not allow those.
      this.config.redirectUri = window.location.href.split("?")[0].split("#")[0];
    }

    if (!this.config.postLogoutRedirectUri) {
      // strip off query parameters or hashes from the post logout redirect uri as AAD does not allow those.
      this.config.postLogoutRedirectUri = window.location.href.split("?")[0].split("#")[0];
    }

    if (!this.config.anonymousEndpoints) {
      this.config.anonymousEndpoints = [];
    }

    if (this.config.isAngular) {
      this.isAngular = this.config.isAngular;
    }

    if (this.config.loadFrameTimeout) {
      Constants.LOADFRAME_TIMEOUT = this.config.loadFrameTimeout;
    }

    // if (typeof window !== 'undefined') {
    //     window.Logging = {
    //         level: 0,
    //         log: function (message) { }
    //     };
    // }
  }

  /**
   * Initiates the login process by redirecting the user to Azure AD authorization endpoint.
   */
  public login(): void {
    if (this._loginInProgress) {
      //this.info("Login in progress");
      return;
    }

    this._loginInProgress = true;

    // Token is not present and user needs to login
    var expectedState = Utils.createNewGuid();
    this.config.state = expectedState;
    this._idTokenNonce = Utils.createNewGuid();
    var loginStartPage = this._getItem(this.CONSTANTS.STORAGE.ANGULAR_LOGIN_REQUEST);

    if (!loginStartPage || loginStartPage === "") {
      loginStartPage = window.location.href;
    }
    else {
      this._saveItem(this.CONSTANTS.STORAGE.ANGULAR_LOGIN_REQUEST, "")
    }

    this.verbose('Expected state: ' + expectedState + ' startPage:' + loginStartPage);
    this._saveItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST, loginStartPage);
    this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, '');
    this._saveItem(this.CONSTANTS.STORAGE.STATE_LOGIN, expectedState, true);
    this._saveItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN, this._idTokenNonce, true);
    this._saveItem(this.CONSTANTS.STORAGE.ERROR, '');
    this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');
    var urlNavigate = this._getNavigateUrl('id_token', null) + '&nonce=' + encodeURIComponent(this._idTokenNonce);

    if (this.config.displayCall) {
      // User defined way of handling the navigation
      this.config.displayCall(urlNavigate);
    }
    else if (this.popUp) {
      this._saveItem(this.CONSTANTS.STORAGE.STATE_LOGIN, '');// so requestInfo does not match redirect case
      this._renewStates.push(expectedState);
      this.registerCallback(expectedState, this.config.clientId, this.callback);
      this._loginPopup(urlNavigate);
    }
    else {
      this.promptUser(urlNavigate);
    }
  };

  //-------------------------------common --------------------------------------------

    /*
   * Configures popup window for login.
   * @ignore
   * @hidden
   */
  private openPopup(urlNavigate: string, title: string, popUpWidth: number, popUpHeight: number) {
    try {
      /*
       * adding winLeft and winTop to account for dual monitor
       * using screenLeft and screenTop for IE8 and earlier
       */
      const winLeft = window.screenLeft ? window.screenLeft : window.screenX;
      const winTop = window.screenTop ? window.screenTop : window.screenY;
      /*
       * window.innerWidth displays browser window"s height and width excluding toolbars
       * using document.documentElement.clientWidth for IE8 and earlier
       */
      const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
      const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
      const left = ((width / 2) - (popUpWidth / 2)) + winLeft;
      const top = ((height / 2) - (popUpHeight / 2)) + winTop;

      const popupWindow = window.open(urlNavigate, title, "width=" + popUpWidth + ", height=" + popUpHeight + ", top=" + top + ", left=" + left);
      if (popupWindow.focus) {
        popupWindow.focus();
      }

      return popupWindow;
    } catch (e) {
      this._logger.error("error opening popup " + e.message);
      this._loginInProgress = false;
      this._acquireTokenInProgress = false;
      return null;
    }
  }

    /*
   * Loads iframe with authorization endpoint URL
   * @ignore
   * @hidden
   */
  private loadFrame(urlNavigate: string, frameName: string): void {
    // This trick overcomes iframe navigation in IE
    // IE does not load the page consistently in iframe
    this._logger.info("LoadFrame: " + frameName);
    var frameCheck = frameName;
    setTimeout(() => {
      var frameHandle = this.addAdalFrame(frameCheck);
      if (frameHandle.src === "" || frameHandle.src === "about:blank") {
        frameHandle.src = urlNavigate;
      }
    },
      500);
  }

    /*
   * Adds the hidden iframe for silent token renewal.
   * @ignore
   * @hidden
   */
  private addAdalFrame(iframeId: string): HTMLIFrameElement {
    if (typeof iframeId === "undefined") {
      return null;
    }

    this._logger.info("Add msal frame to document:" + iframeId);
    let adalFrame = document.getElementById(iframeId) as HTMLIFrameElement;
    if (!adalFrame) {
      if (document.createElement &&
        document.documentElement &&
        (window.navigator.userAgent.indexOf("MSIE 5.0") === -1)) {
        const ifr = document.createElement("iframe");
        ifr.setAttribute("id", iframeId);
        ifr.style.visibility = "hidden";
        ifr.style.position = "absolute";
        ifr.style.width = ifr.style.height = "0";
        ifr.style.border = "0";
        adalFrame = (document.getElementsByTagName("body")[0].appendChild(ifr) as HTMLIFrameElement);
      } else if (document.body && document.body.insertAdjacentHTML) {
          document.body.insertAdjacentHTML('beforeend', '<iframe name="' + iframeId + '" id="' + iframeId + '" style="display:none"></iframe>');
      }

      if (window.frames && window.frames[iframeId]) {
        adalFrame = window.frames[iframeId];
      }
    }

    return adalFrame;
  }

  /*
   * Returns the anchor part(#) of the URL
   * @ignore
   * @hidden
   */
  private getHash(hash: string): string {
    if (hash.indexOf("#/") > -1) {
      hash = hash.substring(hash.indexOf("#/") + 2);
    } else if (hash.indexOf("#") > -1) {
      hash = hash.substring(1);
    }

    return hash;
  }

    /*
   * Checks if the redirect response is received from the STS. In case of redirect, the url fragment has either id_token, access_token or error.
   * @param {string} hash - Hash passed from redirect page.
   * @returns {Boolean} - true if response contains id_token, access_token or error, false otherwise.
   * @hidden
   */
  isCallback(hash: string): boolean {
    hash = this.getHash(hash);
    const parameters = Utils.deserialize(hash);
    return (
      parameters.hasOwnProperty(Constants.errorDescription) ||
      parameters.hasOwnProperty(Constants.error) ||
      parameters.hasOwnProperty(Constants.accessToken) ||
      parameters.hasOwnProperty(Constants.idToken)

    );
  }

  /*
  * Creates a requestInfo object from the URL fragment and returns it.
  * @param {string} hash  -  Hash passed from redirect page
  * @returns {TokenResponse} an object created from the redirect response from AAD comprising of the keys - parameters, requestType, stateMatch, stateResponse and valid.
  * @ignore
  * @hidden
  */
  private getRequestInfo(hash: string): TokenResponse {
    hash = this.getHash(hash);
    const parameters = Utils.deserialize(hash);
    const tokenResponse = new TokenResponse();
    if (parameters) {
      tokenResponse.parameters = parameters;
      if (parameters.hasOwnProperty(Constants.errorDescription) ||
        parameters.hasOwnProperty(Constants.error) ||
        parameters.hasOwnProperty(Constants.accessToken) ||
        parameters.hasOwnProperty(Constants.idToken)) {
        tokenResponse.valid = true;
        // which call
        let stateResponse: string;
        if (parameters.hasOwnProperty("state")) {
            stateResponse = parameters.state;
        } else {
            return tokenResponse;
        }

        tokenResponse.stateResponse = stateResponse;
        // async calls can fire iframe and login request at the same time if developer does not use the API as expected
        // incoming callback needs to be looked up to find the request type
        if (stateResponse === this._cacheStorage.getItem(Constants.stateLogin)) { // loginRedirect
          tokenResponse.requestType = Constants.login;
          tokenResponse.stateMatch = true;
          return tokenResponse;
        } else if (stateResponse === this._cacheStorage.getItem(Constants.stateAcquireToken)) { //acquireTokenRedirect
          tokenResponse.requestType = Constants.renewToken;
          tokenResponse.stateMatch = true;
          return tokenResponse;
        }

        // external api requests may have many renewtoken requests for different resource
        if (!tokenResponse.stateMatch) {
          if (window.parent && window.parent !== window) {
            tokenResponse.requestType = Constants.renewToken;
          }
          else {
            tokenResponse.requestType = this._requestType;
          }
          const statesInParentContext = this._renewStates;
          for (let i = 0; i < statesInParentContext.length; i++) {
            if (statesInParentContext[i] === tokenResponse.stateResponse) {
              tokenResponse.stateMatch = true;
              break;
            }
          }
        }
      }
    }
    return tokenResponse;
  }

  /*
  * Used to redirect the browser to the STS authorization endpoint
  * @param {string} urlNavigate - URL of the authorization endpoint
  * @hidden
  */
  private promptUser(urlNavigate: string) {
    if (urlNavigate && !Utils.isEmpty(urlNavigate)) {
      this._logger.info("Navigate to:" + urlNavigate);
      window.location.replace(urlNavigate);
    } else {
      this._logger.info("Navigate url is empty");
    }
  }

  // ----------------------------------unique to adal------------------------------------------
  loginInProgress():boolean {
    return this._loginInProgress;
  }

  private _serialize(responseType:string, obj:object, resource:string) {
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

  private _handlePopupError(loginCallback, resource:string, error, errorDesc, loginError) {
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

  private _loginPopup(urlNavigate:string, resource:string, callback) {
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
  }

  private _broadcast(eventName, data) {
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
  }

  getCachedToken(resource:string) {
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
  }

  getCachedUser() {
    if (this._user) {
      return this._user;
    }

    var idtoken = this._getItem(this.CONSTANTS.STORAGE.IDTOKEN);
    this._user = this._createUser(idtoken);
    return this._user;
  }

  registerCallback(expectedState:string, resource:string, callback) {
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
  }

  private _renewToken(resource:string, callback:tokenReceivedCallback, responseType:string) {
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
  }

  private _renewIdToken(callback:tokenReceivedCallback, responseType:string) {
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
  }

  private _loadFrameTimeout(urlNavigation:string, frameName, resource:string) {
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

  acquireToken(resource:string, callback:tokenReceivedCallback) {
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
  }

  acquireTokenPopup(resource:string, extraQueryParameters, claims, callback) {
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
  }

  acquireTokenRedirect(resource:string, extraQueryParameters, claims) {
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
  }

  logOut() {
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
  }

  getUser(callback:tokenReceivedCallback) {
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
  }

  private _addHintParameters(urlNavigate:string) {
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

  private _matchNonce(user) {
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
  }

  private _matchState(requestInfo) {
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
  }

  saveTokenFromHash(requestInfo) {
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
  }

  getResourceForEndpoint(endpoint) {
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
  }

  handleWindowCallback(hash:string) {
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
  }

  private _getNavigateUrl(responseType:string, resource:string) {
    var tenant = 'common';
    if (this.config.tenant) {
        tenant = this.config.tenant;
    }

    var urlNavigate = this.instance + tenant + '/oauth2/authorize' + this._serialize(responseType, this.config, resource) + this._addLibMetadata();
    this.info('Navigate url:' + urlNavigate);
    return urlNavigate;
  }     
      
  private _cloneConfig(obj:object) {
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
  }
}

// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = AuthenticationContext;
//   module.exports.inject = function (conf) {
//       return new AuthenticationContext(conf);
//   };
// }