import { AdalConfig, TokenReceivedCallback } from "./adalConfig";
import { User } from "./user";
import { Constants } from "./constants";
import { RequestType } from "./requestType";
import { ResponseType } from "./responseType";

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
    private _requestType : string = RequestType.LOGIN;

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
            this.CONSTANTS.LOADFRAME_TIMEOUT = this.config.loadFrameTimeout;
        }
    }
}