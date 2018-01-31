import { AdalConfig } from "./adalConfig";
import { User } from "./user";
import { Constants } from "./constants";
import { RequestType } from "./requestType";
import { ResponseType } from "./responseType";

export type TokenReceivedCallback = (errorDesc: string, token: string, error: string, tokenType: string) => void;

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
    //window._adalInstance = this;   //  <===================

    constructor(config: AdalConfig) {

    }
}