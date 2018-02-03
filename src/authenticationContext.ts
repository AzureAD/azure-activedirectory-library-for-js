import { AdalConfig } from "./adalConfig";
import { User } from "./user";
import { Constants } from "./constants";
import { RequestType } from "./requestType";
import { ResponseType } from "./responseType";
import { TokenReceivedCallback } from "./tokenReceivedCallback";
import { Guid } from "./guid";

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
        var expectedState = Guid.createGuid();
        this.config.state = expectedState;
        this._idTokenNonce = Guid.createGuid();
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
}