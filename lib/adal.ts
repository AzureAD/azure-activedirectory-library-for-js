//----------------------------------------------------------------------
// AdalJS v1.0.13
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
type AuthenticationConfig = {
    tenant: string;
    clientId: string;
    redirectUri: string;
    instance: string;
    endpoints: string;
    displayCall: Function;

};

type CloneAuthenticationConfig = {
    tenant: string;
    clientId: string;
    redirectUri: string;
    instance: string;
    endpoints: string;
    displayCall: Function;
    loginResource: string;
    anonymousEndpoints: Array<string>;
    isAngular: boolean;
    state: string;
    correlationId: string;
    cacheLocation: string;
    expireOffsetSeconds: number;
    postLogoutRedirectUri: string;
};


export class AuthenticationContext {
    private REQUEST_TYPE = {
        "LOGIN": "LOGIN",
        "RENEW_TOKEN": "RENEW_TOKEN",
        "UNKNOWN": "UNKNOWN"
    };

    private CONSTANTS = {
        "ACCESS_TOKEN": "access_token",
        "EXPIRES_IN": "expires_in",
        "ID_TOKEN": "id_token",
        "ERROR_DESCRIPTION": "error_description",
        "SESSION_STATE": "session_state",
        "STORAGE": {
            "TOKEN_KEYS": "adal.token.keys",
            "ACCESS_TOKEN_KEY": "adal.access.token.key",
            "EXPIRATION_KEY": "adal.expiration.key",
            "STATE_LOGIN": "adal.state.login",
            "STATE_RENEW": "adal.state.renew",
            "NONCE_IDTOKEN": "adal.nonce.idtoken",
            "SESSION_STATE": "adal.session.state",
            "USERNAME": "adal.username",
            "IDTOKEN": "adal.idtoken",
            "ERROR": "adal.error",
            "ERROR_DESCRIPTION": "adal.error.description",
            "LOGIN_REQUEST": "adal.login.request",
            "LOGIN_ERROR": "adal.login.error",
            "RENEW_STATUS": "adal.token.renew.status"
        },
        "RESOURCE_DELIMETER": "|",
        "LOADFRAME_TIMEOUT": "6000",
        "TOKEN_RENEW_STATUS_CANCELED": "Canceled",
        "TOKEN_RENEW_STATUS_COMPLETED": "Completed",
        "TOKEN_RENEW_STATUS_IN_PROGRESS": "In Progress",
        "LOGGING_LEVEL": {
            "ERROR": 0,
            "WARN": 1,
            "INFO": 2,
            "VERBOSE": 3
        },
        "LEVEL_STRING_MAP": {
            0: "ERROR:",
            1: "WARNING:",
            2: "INFO:",
            3: "VERBOSE:"
        },
        "POPUP_WIDTH": 483,
        "POPUP_HEIGHT": 600
    };

    private _user: any;
    private _activeRenewals: any;
    private _loginInProgress: boolean;
    private _renewStates: Array<any>;
    private callBackMappedToRenewStates: any;
    private callBacksMappedToRenewStates: any;
    private Logging: any;
    private _idTokenNonce: string;

    public instance: string;
    public config: CloneAuthenticationConfig;
    public callback: Function;
    public popUp: boolean;
    public isAngular: boolean;


    /**
     * User information from idtoken.
     *  @class User
     *  @property {string} userName - username assigned from upn or email.
     *  @property {object} profile - properties parsed from idtoken.
     */

    constructor(config: AuthenticationConfig) {
        this.callBackMappedToRenewStates = {};
        this.callBacksMappedToRenewStates = {};
        this.Logging = {
            level: 0,
            log: function (message) {
                console.log(message);
            }
        };

        // validate before constructor assignments
        if (config.displayCall && typeof config.displayCall !== "function") {
            throw new Error("displayCall is not a function");
        }

        if (!config.clientId) {
            throw new Error("clientId is required");
        }

        if (!config.clientId) {
            throw new Error("clientId is required");
        }

        this.config = <CloneAuthenticationConfig>this._cloneConfig(config);

        // App can request idtoken for itself using clientid as resource
        if (!this.config.loginResource) {
            this.config.loginResource = this.config.clientId;
        }

        if (!this.config.redirectUri) {
            this.config.redirectUri = window.location.href;
        }

        if (!this.config.anonymousEndpoints) {
            this.config.anonymousEndpoints = [];
        }

        if (this.config.isAngular) {
            this.isAngular = this.config.isAngular;
        }
    }

    private _cloneConfig(obj: Object): Object {
        if (null === obj || "object" !== typeof obj) {
            return obj;
        }

        let copy = {};
        for (let attr in obj) {
            if (obj.hasOwnProperty(attr)) {
                copy[attr] = obj[attr];
            }
        }
        return copy;
    }

    private _guid(): string {
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
        let cryptoObj = window.crypto || (<any>window).msCrypto; // for IE 11
        if (cryptoObj && cryptoObj.getRandomValues) {
            let buffer = new Uint8Array(16);
            cryptoObj.getRandomValues(buffer);
            //buffer[6] and buffer[7] represents the time_hi_and_version field. We will set the four most significant bits (4 through 7) of buffer[6] to represent decimal number 4 (UUID version number).
            buffer[6] |= 0x40; //buffer[6] | 01000000 will set the 6 bit to 1.
            buffer[6] &= 0x4f; //buffer[6] & 01001111 will set the 4, 5, and 7 bit to 0 such that bits 4-7 == 0100 = "4".
            //buffer[8] represents the clock_seq_hi_and_reserved field. We will set the two most significant bits (6 and 7) of the clock_seq_hi_and_reserved to zero and one, respectively.
            buffer[8] |= 0x80; //buffer[8] | 10000000 will set the 7 bit to 1.
            buffer[8] &= 0xbf; //buffer[8] & 10111111 will set the 6 bit to 0.
            return `
            ${this._decimalToHex(buffer[0])}${this._decimalToHex(buffer[1])}${this._decimalToHex(buffer[2])}${this._decimalToHex(buffer[3])}-${this._decimalToHex(buffer[4])}${this._decimalToHex(buffer[5])}-${this._decimalToHex(buffer[6])}${this._decimalToHex(buffer[7])}-${this._decimalToHex(buffer[8])}${this._decimalToHex(buffer[9])}-${this._decimalToHex(buffer[10])}${this._decimalToHex(buffer[11])}${this._decimalToHex(buffer[12])}${this._decimalToHex(buffer[13])}${this._decimalToHex(buffer[14])}${this._decimalToHex(buffer[15])}
            `;
        } else {
            let guidHolder = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
            let hex = "0123456789abcdef";
            let r = 0;
            let guidResponse = "";
            for (let i = 0; i < 36; i++) {
                if (guidHolder[i] !== "-" && guidHolder[i] !== "4") {
                    // each x and y needs to be random
                    r = Math.random() * 16 | 0;
                }
                if (guidHolder[i] === "x") {
                    guidResponse += hex[r];
                } else if (guidHolder[i] === "y") {
                    // clock-seq-and-reserved first hex is filtered and remaining hex values are random
                    r &= 0x3; // bit and with 0011 to set pos 2 to zero ?0??
                    r |= 0x8; // set pos 3 to 1 as 1???
                    guidResponse += hex[r];
                } else {
                    guidResponse += guidHolder[i];
                }
            }
            return guidResponse;
        }
    }

    private _decimalToHex(number: number): string {
        let hex: string = number.toString(16);
        while (hex.length < 2) {
            hex = "0" + hex;
        }
        return hex;
    }

    private _libVersion() {
        return "1.0.1";
    }

    private _saveItem(key: string, obj: any): any {
        if (this.config && this.config.cacheLocation && this.config.cacheLocation === "localStorage") {
            if (!this._supportsLocalStorage()) {
                this.info("Local storage is not supported");
                return false;
            }

            localStorage.setItem(key, obj);

            return true;
        }
        // Default as session storage
        if (!this._supportsSessionStorage()) {
            this.info("Session storage is not supported");
            return false;
        }

        sessionStorage.setItem(key, obj);
        return true;
    }

    private _supportsLocalStorage(): Storage | boolean {
        try {
            return "localStorage" in window && window["localStorage"];
        } catch (e) {
            return false;
        }
    }

    private _supportsSessionStorage(): Storage | boolean {
        try {
            return "sessionStorage" in window && window["sessionStorage"];
        } catch (e) {
            return false;
        }
    }

    private _getNavigateUrl(responseType: string, resource: string): string {
        var tenant = "common";
        if (this.config.tenant) {
            tenant = this.config.tenant;
        }

        var urlNavigate = `
            ${this.instance}${tenant}/oauth2/authorize${this._serialize(responseType, this.config, resource)}${this._addLibMetadata()}
        `;
        this.info(`Navigate url:${urlNavigate}`);
        return urlNavigate;
    }

    private _serialize(responseType: string, obj: any, resource: string): string {
        let str = [];
        if (obj !== null) {
            str.push(`?response_type=${responseType}`);
            str.push(`client_id=${encodeURIComponent(obj.clientId)}`);
            if (resource) {
                str.push(`resource=${encodeURIComponent(resource)}`);
            }

            str.push(`redirect_uri=${encodeURIComponent(obj.redirectUri)}`);
            str.push(`state=${encodeURIComponent(obj.state)}`);

            if (obj.hasOwnProperty("slice")) {
                str.push(`slice=${encodeURIComponent(obj.slice)}`);
            }

            if (obj.hasOwnProperty("extraQueryParameter")) {
                str.push(obj.extraQueryParameter);
            }

            let correlationId = obj.correlationId ? obj.correlationId : this._guid();
            str.push(`client-request-id=${encodeURIComponent(correlationId)}`);
        }

        return str.join("&");
    }

    private _deserialize(query: string): any {
        let match,
            pl = /\+/g,  // Regex for replacing addition symbol with a space
            search = /([^&=]+)=([^&]*)/g,
            decode = s => {
                return decodeURIComponent(s.replace(pl, " "));
            },
            obj = {};
        match = search.exec(query);
        while (match) {
            obj[decode(match[1])] = decode(match[2]);
            match = search.exec(query);
        }

        return obj;
    }

    private _addLibMetadata() {
        // x-client-SKU
        // x-client-Ver
        return `&x-client-SKU=Js&x-client-Ver=${this._libVersion()}`;
    }

    private _loginPopup(urlNavigate: string) {
        var popupWindow = this._openPopup(
            urlNavigate,
            "login",
            this.CONSTANTS.POPUP_WIDTH,
            this.CONSTANTS.POPUP_HEIGHT);

        if (popupWindow == null) {
            this.warn("Popup Window is null. This can happen if you are using IE");
            this._saveItem(this.CONSTANTS.STORAGE.ERROR, "Error opening popup");
            this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, "Popup Window is null. This can happen if you are using IE");
            this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, "Popup Window is null. This can happen if you are using IE");
            if (this.callback) {
                this.callback(this._getItem(this.CONSTANTS.STORAGE.LOGIN_ERROR), null);
            }
            return;
        }
        let registeredRedirectUri = "";
        if (this.config.redirectUri.indexOf("#") !== -1) {
            registeredRedirectUri = this.config.redirectUri.split("#")[0];
        } else {
            registeredRedirectUri = this.config.redirectUri;
        }
        const pollTimer = window.setInterval(() => {
            if (!popupWindow || popupWindow.closed || popupWindow.closed === undefined) {
                this._loginInProgress = false;
                window.clearInterval(pollTimer);
            }
            try {
                if (popupWindow.location.href.indexOf(registeredRedirectUri) !== -1) {
                    if (this.isAngular) {
                        window.location.hash = popupWindow.location.hash;
                    } else {
                        this.handleWindowCallback(popupWindow.location.hash);
                    }
                    window.clearInterval(pollTimer);
                    this._loginInProgress = false;
                    this.info("Closing popup window");
                    popupWindow.close();
                }
            } catch (e) {
                throw e;
            }
        }, 20);
    }

    private _openPopup(urlNavigate: string, title: string, popUpWidth: number, popUpHeight: number): Window {
        try {
            /**
             * adding winLeft and winTop to account for dual monitor
             * using screenLeft and screenTop for IE8 and earlier
             */
            const winLeft = window.screenLeft ? window.screenLeft : window.screenX;
            const winTop = window.screenTop ? window.screenTop : window.screenY;
            /**
             * window.innerWidth displays browser window's height and width excluding toolbars
             * using document.documentElement.clientWidth for IE8 and earlier
             */
            const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
            const left = ((width / 2) - (popUpWidth / 2)) + winLeft;
            const top = ((height / 2) - (popUpHeight / 2)) + winTop;

            const popupWindow = window.open(urlNavigate, title, `width=${popUpWidth}, height=${popUpHeight},  top=${top}, left=${left}`);
            if (popupWindow.focus) {
                popupWindow.focus();
            }
            return popupWindow;
        } catch (e) {
            this.warn(`Error opening popup, ${e.message}`);
            this._loginInProgress = false;
            return null;
        }
    }

    private _getItem(key: string): string {
        if (this.config && this.config.cacheLocation && this.config.cacheLocation === "localStorage") {

            if (!this._supportsLocalStorage()) {
                this.info("Local storage is not supported");
                return null;
            }

            return localStorage.getItem(key);
        }

        // Default as session storage
        if (!this._supportsSessionStorage()) {
            this.info("Session storage is not supported");
            return null;
        }

        return sessionStorage.getItem(key);
    }

    private _getHash(hash: string): string {
        if (hash.indexOf("#/") > -1) {
            hash = hash.substring(hash.indexOf("#/") + 2);
        } else if (hash.indexOf("#") > -1) {
            hash = hash.substring(1);
        }

        return hash;
    }

    private _getResourceFromState(state: string): string {
        if (state) {
            var splitIndex = state.indexOf("|");
            if (splitIndex > -1 && splitIndex + 1 < state.length) {
                return state.substring(splitIndex + 1);
            }
        }

        return "";
    }

    private _hasResource(key: string): boolean {
        var keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS);
        return keys && !this._isEmpty(keys) && (keys.indexOf(key + this.CONSTANTS.RESOURCE_DELIMETER) > -1);
    }

    private _isEmpty(str) {
        return (typeof str === "undefined" || !str || 0 === str.length);
    }

    private _expiresIn(expires) {
        return this._now() + parseInt(expires, 10);
    }

    private _now() {
        return Math.round(new Date().getTime() / 1000.0);
    }

    private _createUser(idToken: string): any {
        let user = null;
        const parsedJson = this._extractIdToken(idToken);
        if (parsedJson && parsedJson.hasOwnProperty("aud")) {
            if (parsedJson.aud.toLowerCase() === this.config.clientId.toLowerCase()) {
                user = {
                    userName: "",
                    profile: parsedJson
                };

                if (parsedJson.hasOwnProperty("upn")) {
                    user.userName = parsedJson.upn;
                } else if (parsedJson.hasOwnProperty("email")) {
                    user.userName = parsedJson.email;
                }
            } else {
                this.warn("IdToken has invalid aud field");
            }
        }

        return user;
    }

    private _extractIdToken(encodedIdToken: string): any|null {
        // id token will be decoded to get the username
        const decodedToken = this._decodeJwt(encodedIdToken);
        if (!decodedToken) {
            return null;
        }

        try {
            var base64IdToken = decodedToken.JWSPayload;
            var base64Decoded = this._base64DecodeStringUrlSafe(base64IdToken);
            if (!base64Decoded) {
                this.info("The returned id_token could not be base64 url safe decoded.");
                return null;
            }

            // ECMA script has JSON built-in support
            return JSON.parse(base64Decoded);
        } catch (err) {
            this.error("The returned id_token could not be decoded", err);
        }

        return null;
    }

    private _decodeJwt(jwtToken: string): any {
        if (this._isEmpty(jwtToken)) {
            return null;
        };

        const idTokenPartsRegex = /^([^\.\s]*)\.([^\.\s]+)\.([^\.\s]*)$/;

        const matches = idTokenPartsRegex.exec(jwtToken);
        if (!matches || matches.length < 4) {
            this.warn("The returned id_token is not parseable.");
            return null;
        }

        const crackedToken = {
            header: matches[1],
            JWSPayload: matches[2],
            JWSSig: matches[3]
        };

        return crackedToken;
    }

    private _base64DecodeStringUrlSafe(base64IdToken: string): string {
        // html5 should support atob function for decoding
        base64IdToken = base64IdToken.replace(/-/g, "+").replace(/_/g, "/");
        if (window.atob) {
            return decodeURIComponent((<any>window).escape(window.atob(base64IdToken))); // jshint ignore:line
        } else {
            return decodeURIComponent((<any>window).escape(this._decode(base64IdToken)));
        }
    }

    private _decode(base64IdToken: string): string {
        const codes = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        base64IdToken = String(base64IdToken).replace(/=+$/, "");

        const length = base64IdToken.length;
        if (length % 4 === 1) {
            throw new Error("The token to be decoded is not correctly encoded.");
        }

        let h1, h2, h3, h4, bits, c1, c2, c3, decoded = "";
        for (let i = 0; i < length; i += 4) {
            //Every 4 base64 encoded character will be converted to 3 byte string, which is 24 bits
            // then 6 bits per base64 encoded character
            h1 = codes.indexOf(base64IdToken.charAt(i));
            h2 = codes.indexOf(base64IdToken.charAt(i + 1));
            h3 = codes.indexOf(base64IdToken.charAt(i + 2));
            h4 = codes.indexOf(base64IdToken.charAt(i + 3));

            // For padding, if last two are '='
            if (i + 2 === length - 1) {
                bits = h1 << 18 | h2 << 12 | h3 << 6;
                c1 = bits >> 16 & 255;
                c2 = bits >> 8 & 255;
                decoded += String.fromCharCode(c1, c2);
                break;
            } else if (i + 1 === length - 1) { // if last one is '='
                bits = h1 << 18 | h2 << 12;
                c1 = bits >> 16 & 255;
                decoded += String.fromCharCode(c1);
                break;
            }

            bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

            // then convert to 3 byte chars
            c1 = bits >> 16 & 255;
            c2 = bits >> 8 & 255;
            c3 = bits & 255;

            decoded += String.fromCharCode(c1, c2, c3);
        }

        return decoded;
    }

    private _renewToken(resource: string, callback: Function): void {
        // use iframe to try refresh token
        // use given resource to create new authz url
        this.info("renewToken is called for resource:" + resource);
        let frameHandle = this._addAdalFrame("adalRenewFrame" + resource);
        const expectedState = this._guid() + "|" + resource;
        this.config.state = expectedState;
        // renew happens in iframe, so it keeps javascript context
        this._renewStates.push(expectedState);

        this.verbose("Renew token Expected state: " + expectedState);
        let urlNavigate = this._getNavigateUrl("token", resource) + "&prompt=none";
        urlNavigate = this._addHintParameters(urlNavigate);

        this.registerCallback(expectedState, resource, callback);
        this.verbose("Navigate to:" + urlNavigate);
        frameHandle.src = "about:blank";
        this._loadFrameTimeout(urlNavigate, "adalRenewFrame" + resource, resource);
    }

    private _renewIdToken(callback: Function): void {
        // use iframe to try refresh token
        this.info("renewIdToken is called");
        let frameHandle: HTMLIFrameElement = this._addAdalFrame("adalIdTokenFrame");
        const expectedState = this._guid() + "|" + this.config.clientId;
        this._idTokenNonce = this._guid();
        this._saveItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN, this._idTokenNonce);
        this.config.state = expectedState;
        // renew happens in iframe, so it keeps javascript context
        this._renewStates.push(expectedState);

        this.verbose("Renew Idtoken Expected state: " + expectedState);
        let urlNavigate = this._getNavigateUrl("id_token", null) + "&prompt=none";
        urlNavigate = this._addHintParameters(urlNavigate);

        urlNavigate += "&nonce=" + encodeURIComponent(this._idTokenNonce);
        this.registerCallback(expectedState, this.config.clientId, callback);
        this._idTokenNonce = null;
        this.verbose("Navigate to:" + urlNavigate);
        frameHandle.src = "about:blank";
        this._loadFrameTimeout(urlNavigate, "adalIdTokenFrame", this.config.clientId);
    }

    private _addAdalFrame(iframeId: string): HTMLIFrameElement {
        if (typeof iframeId === "undefined") {
            return;
        }

        this.info(`Add adal frame to document:${iframeId}`);
        let adalFrame: HTMLIFrameElement = <HTMLIFrameElement>document.getElementById(iframeId);

        if (!adalFrame) {
            if (document.createElement && document.documentElement &&
                ((<any>window).opera || window.navigator.userAgent.indexOf("MSIE 5.0") === -1)) {
                let ifr = document.createElement("iframe");
                ifr.setAttribute("id", iframeId);
                ifr.style.visibility = "hidden";
                ifr.style.position = "absolute";
                ifr.style.width = ifr.style.height = (<any>ifr).borderWidth = "0px";

                adalFrame = document.getElementsByTagName("body")[0].appendChild(ifr);
            } else if (document.body && document.body.insertAdjacentHTML) {
                document.body.insertAdjacentHTML(
                    "beforeEnd",
                    `<iframe name="${iframeId}" id="${iframeId}" style="display:none"></iframe>`);
            }
            if (window.frames && window.frames[iframeId]) {
                adalFrame = window.frames[iframeId];
            }
        }

        return adalFrame;
    }

    private _addHintParameters(urlNavigate: string): string {
        // include hint params only if upn is present
        if (this._user && this._user.profile && this._user.profile.hasOwnProperty("upn")) {

            // add login_hint
            urlNavigate += "&login_hint=" + encodeURIComponent(this._user.profile.upn);

            // don't add domain_hint twice if user provided it in the extraQueryParameter value
            if (!this._urlContainsQueryStringParameter("domain_hint", urlNavigate) && this._user.profile.upn.indexOf("@") > -1) {
                var parts = this._user.profile.upn.split("@");
                // local part can include @ in quotes. Sending last part handles that.
                urlNavigate += "&domain_hint=" + encodeURIComponent(parts[parts.length - 1]);
            }
        }

        return urlNavigate;
    }

    private _urlContainsQueryStringParameter(name: string, url: string): boolean {
        // regex to detect pattern of a ? or & followed by the name parameter and an equals character
        const regex = new RegExp("[\\?&]" + name + "=");
        return regex.test(url);
    }

    private _loadFrameTimeout(urlNavigation: string, frameName: string, resource: string) {
        //set iframe session topending
        this.verbose("Set loading state to pending for: " + resource);
        this._saveItem(this.CONSTANTS.STORAGE.RENEW_STATUS + resource, this.CONSTANTS.TOKEN_RENEW_STATUS_IN_PROGRESS);
        this._loadFrame(urlNavigation, frameName);
        setTimeout(() => {
            if (this._getItem(this.CONSTANTS.STORAGE.RENEW_STATUS + resource) === this.CONSTANTS.TOKEN_RENEW_STATUS_IN_PROGRESS) {
                // fail the iframe session if it's in pending state
                this.verbose(`
                    Loading frame has timed out after: ${(Number(this.CONSTANTS.LOADFRAME_TIMEOUT) / 1000)} seconds for resource ${resource}
                `);
                const expectedState = this._activeRenewals[resource];
                if (expectedState && this.callBackMappedToRenewStates[expectedState]) {
                    this.callBackMappedToRenewStates[expectedState]("Token renewal operation failed due to timeout", null);
                }

                this._saveItem(this.CONSTANTS.STORAGE.RENEW_STATUS + resource, this.CONSTANTS.TOKEN_RENEW_STATUS_CANCELED);
            }
        }, this.CONSTANTS.LOADFRAME_TIMEOUT);
    }

    private _loadFrame(urlNavigate: string, frameName: string): void {
        // This trick overcomes iframe navigation in IE
        // IE does not load the page consistently in iframe
        this.info("LoadFrame: " + frameName);
        const frameCheck = frameName;
        setTimeout(() => {
            let frameHandle = this._addAdalFrame(frameCheck);
            if (frameHandle.src === "" || frameHandle.src === "about:blank") {
                frameHandle.src = urlNavigate;
                this._loadFrame(urlNavigate, frameCheck);
            }
        }, 500);
    };

    public log(level: number, message: string, error: Error): void {
        if (level <= this.Logging.level) {
            const timestamp = new Date().toUTCString();
            let formattedMessage = "";

            if (this.config.correlationId) {
                formattedMessage = `
                    ${timestamp}:${this.config.correlationId}-${this._libVersion()}-${this.CONSTANTS.LEVEL_STRING_MAP[level]} ${message}
                `;
            } else {
                formattedMessage = `
                    ${timestamp}:${this._libVersion()}-${this.CONSTANTS.LEVEL_STRING_MAP[level]} ${message}
                `;
            }

            if (error) {
                formattedMessage += `\nstack:\n${error.stack}`;
            }

            this.Logging.log(formattedMessage);
        }
    }

    public info(message: string): void {
        this.log(this.CONSTANTS.LOGGING_LEVEL.INFO, message, null);
    }

    public warn(message) {
        this.log(this.CONSTANTS.LOGGING_LEVEL.WARN, message, null);
    }

    public error(message, error) {
        this.log(this.CONSTANTS.LOGGING_LEVEL.ERROR, message, error);
    }

    public verbose(message: string): void {
        this.log(this.CONSTANTS.LOGGING_LEVEL.VERBOSE, message, null);
    }

    public login() {
        // Token is not present and user needs to login
        if (this._loginInProgress) {
            this.info("Login in progress");
            return;
        }
        const expectedState = this._guid();
        this.config.state = expectedState;
        this._idTokenNonce = this._guid();
        this.verbose("Expected state: " + expectedState + " startPage:" + window.location);
        this._saveItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST, window.location);
        this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, "");
        this._saveItem(this.CONSTANTS.STORAGE.STATE_LOGIN, expectedState);
        this._saveItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN, this._idTokenNonce);
        this._saveItem(this.CONSTANTS.STORAGE.ERROR, "");
        this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, "");
        var urlNavigate = this._getNavigateUrl("id_token", null) + "&nonce=" + encodeURIComponent(this._idTokenNonce);
        this._loginInProgress = true;
        if (this.popUp) {
            this._loginPopup(urlNavigate);
            return;
        }
        if (this.config.displayCall) {
            // User defined way of handling the navigation
            this.config.displayCall(urlNavigate);
        } else {
            this.promptUser(urlNavigate);
        }
    }

    public loginInProgress() {
        return this._loginInProgress;
    }

    public handleWindowCallback(hash: string) {
        // This is for regular javascript usage for redirect handling
        // need to make sure this is for callback
        if (hash == null) {
            hash = window.location.hash;
        }
        if (this.isCallback(hash)) {
            let requestInfo = this.getRequestInfo(hash);
            this.info("Returned from redirect url");
            this.saveTokenFromHash(requestInfo);
            let callback = null;
            if ((requestInfo.requestType === this.REQUEST_TYPE.RENEW_TOKEN) && window.parent && (window.parent !== window)) {
                // iframe call but same single page
                this.verbose("Window is in iframe");
                callback = this.callBackMappedToRenewStates[requestInfo.stateResponse];
                if (callback) {
                    callback(this._getItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters[this.CONSTANTS.ACCESS_TOKEN] || requestInfo.parameters[this.CONSTANTS.ID_TOKEN]);
                }
                return;
            } else if (requestInfo.requestType === this.REQUEST_TYPE.LOGIN) {
                callback = this.callback;
                if (callback) {
                    callback(this._getItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters[this.CONSTANTS.ID_TOKEN]);
                }
            }

            if (!this.popUp) {// No need to redirect user in case of popup
                (<any>window).location = this._getItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST);
            }
        }
    }

    public promptUser(urlNavigate: string): void {
        if (urlNavigate) {
            this.info(`Navigate to:${urlNavigate}`);
            window.location.replace(urlNavigate);
        } else {
            this.info("Navigate url is empty");
        }
    }

    public isCallback(hash) {
        hash = this._getHash(hash);
        const parameters = this._deserialize(hash);
        return (
            parameters.hasOwnProperty(this.CONSTANTS.ERROR_DESCRIPTION) ||
            parameters.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN) ||
            parameters.hasOwnProperty(this.CONSTANTS.ID_TOKEN)
        );
    }

    public getRequestInfo(hash: string): any {
        hash = this._getHash(hash);
        const parameters = this._deserialize(hash);
        let requestInfo = {
            valid: false,
            parameters: {},
            stateMatch: false,
            stateResponse: "",
            requestType: this.REQUEST_TYPE.UNKNOWN
        };
        if (parameters) {
            requestInfo.parameters = parameters;
            if (parameters.hasOwnProperty(this.CONSTANTS.ERROR_DESCRIPTION) ||
                parameters.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN) ||
                parameters.hasOwnProperty(this.CONSTANTS.ID_TOKEN)) {

                requestInfo.valid = true;

                // which call
                var stateResponse = "";
                if (parameters.hasOwnProperty("state")) {
                    this.verbose("State: " + parameters.state);
                    stateResponse = parameters.state;
                } else {
                    this.warn("No state returned");
                    return requestInfo;
                }

                requestInfo.stateResponse = stateResponse;

                // async calls can fire iframe and login request at the same time if developer does not use the API as expected
                // incoming callback needs to be looked up to find the request type
                if (stateResponse === this._getItem(this.CONSTANTS.STORAGE.STATE_LOGIN)) {
                    requestInfo.requestType = this.REQUEST_TYPE.LOGIN;
                    requestInfo.stateMatch = true;
                    return requestInfo;
                }

                // external api requests may have many renewtoken requests for different resource
                if (!requestInfo.stateMatch && window.parent && (<any>window).parent.AuthenticationContext) {
                    var statesInParentContext = (<any>window).parent.AuthenticationContext()._renewStates;
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
    }

    public saveTokenFromHash(requestInfo) {
        this.info(`State status:${requestInfo.stateMatch}; Request type:${requestInfo.requestType}`);
        this._saveItem(this.CONSTANTS.STORAGE.ERROR, "");
        this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, "");

        let resource = this._getResourceFromState(requestInfo.stateResponse);

        // Record error
        if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ERROR_DESCRIPTION)) {
            this.info(`Error :${requestInfo.parameters.error}; Error description:${requestInfo.parameters[this.CONSTANTS.ERROR_DESCRIPTION]}`);
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
                this.info("State is right");
                if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.SESSION_STATE)) {
                    this._saveItem(this.CONSTANTS.STORAGE.SESSION_STATE, requestInfo.parameters[this.CONSTANTS.SESSION_STATE]);
                }

                let keys;

                if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN)) {
                    this.info("Fragment has access token");

                    if (!this._hasResource(resource)) {
                        keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS) || "";
                        this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, keys + resource + this.CONSTANTS.RESOURCE_DELIMETER);
                    }
                    // save token with related resource
                    this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, requestInfo.parameters[this.CONSTANTS.ACCESS_TOKEN]);
                    this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, this._expiresIn(requestInfo.parameters[this.CONSTANTS.EXPIRES_IN]));
                }

                if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ID_TOKEN)) {
                    this.info("Fragment has id token");
                    this._loginInProgress = false;

                    this._user = this._createUser(requestInfo.parameters[this.CONSTANTS.ID_TOKEN]);

                    if (this._user && this._user.profile) {
                        if (this._user.profile.nonce !== this._getItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN)) {
                            this._user = null;
                            this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, "Nonce is not same as " + this._idTokenNonce);
                        } else {
                            this._saveItem(this.CONSTANTS.STORAGE.IDTOKEN, requestInfo.parameters[this.CONSTANTS.ID_TOKEN]);

                            // Save idtoken as access token for app itself
                            resource = this.config.loginResource ? this.config.loginResource : this.config.clientId;

                            if (!this._hasResource(resource)) {
                                keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS) || "";
                                this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, keys + resource + this.CONSTANTS.RESOURCE_DELIMETER);
                            }
                            this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, requestInfo.parameters[this.CONSTANTS.ID_TOKEN]);
                            this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, this._user.profile.exp);
                        }
                    } else {
                        this._saveItem(this.CONSTANTS.STORAGE.ERROR, "invalid id_token");
                        this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, `Invalid id_token. id_token: ${requestInfo.parameters[this.CONSTANTS.ID_TOKEN]}`);
                    }
                }
            } else {
                this._saveItem(this.CONSTANTS.STORAGE.ERROR, "Invalid_state");
                this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, `Invalid_state. state: ${requestInfo.stateResponse}`);
            }
        }
        this._saveItem(this.CONSTANTS.STORAGE.RENEW_STATUS + resource, this.CONSTANTS.TOKEN_RENEW_STATUS_COMPLETED);
    }

    /**
     * Acquire token from cache if not expired and available. Acquires token from iframe if expired.
     * @param {string}   resource  ResourceUri identifying the target resource
     * @param {requestCallback} callback
     */
    public acquireToken(resource: string, callback: Function): void {
        if (this._isEmpty(resource)) {
            this.warn("resource is required");
            callback("resource is required", null);
            return;
        }

        var token = this.getCachedToken(resource);
        if (token) {
            this.info("Token is already in cache for resource:" + resource);
            callback(null, token);
            return;
        }

        if (!this._user) {
            this.warn("User login is required");
            callback("User login is required", null);
            return;
        }

        // refresh attept with iframe
        //Already renewing for this resource, callback when we get the token.
        if (this._activeRenewals[resource]) {
            //Active renewals contains the state for each renewal.
            this.registerCallback(this._activeRenewals[resource], resource, callback);
        } else {
            if (resource === this.config.clientId) {
                // App uses idtoken to send to api endpoints
                // Default resource is tracked as clientid to store this token
                this.verbose("renewing idtoken");
                this._renewIdToken(callback);
            } else {
                this._renewToken(resource, callback);
            }
        }
    }

    public getCachedToken(resource: string): null|string {
        if (!this._hasResource(resource)) {
            return null;
        }

        let token = this._getItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource);
        let expired = this._getItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource);

        // If expiration is within offset, it will force renew
        let offset = this.config.expireOffsetSeconds || 120;

        if (expired && (expired > this._now() + offset)) {
            return token;
        } else {
            this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, "");
            this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, 0);
            return null;
        }
    }

    public registerCallback(expectedState: string, resource: string, callback: Function): void {
        this._activeRenewals[resource] = expectedState;
        if (!this.callBacksMappedToRenewStates[expectedState]) {
            this.callBacksMappedToRenewStates[expectedState] = [];
        }
        this.callBacksMappedToRenewStates[expectedState].push(callback);
        if (!this.callBackMappedToRenewStates[expectedState]) {
            this.callBackMappedToRenewStates[expectedState] = (message, token) => {
                for (let i = 0; i < this.callBacksMappedToRenewStates[expectedState].length; ++i) {
                    try {
                        this.callBacksMappedToRenewStates[expectedState][i](message, token);
                    } catch (error) {
                        this.warn(error);
                    }
                }
                this._activeRenewals[resource] = null;
                this.callBacksMappedToRenewStates[expectedState] = null;
                this.callBackMappedToRenewStates[expectedState] = null;
            };
        }
    }

    public logOut(): void {
        this.clearCache();
        let tenant = "common";
        let logout = "";
        this._user = null;
        if (this.config.tenant) {
            tenant = this.config.tenant;
        }

        if (this.config.postLogoutRedirectUri) {
            logout = "post_logout_redirect_uri=" + encodeURIComponent(this.config.postLogoutRedirectUri);
        }

        const urlNavigate = this.instance + tenant + "/oauth2/logout?" + logout;
        this.info("Logout navigate to: " + urlNavigate);
        this.promptUser(urlNavigate);
    }

    public clearCache(): void {
        this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY, "");
        this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY, 0);
        this._saveItem(this.CONSTANTS.STORAGE.SESSION_STATE, "");
        this._saveItem(this.CONSTANTS.STORAGE.STATE_LOGIN, "");
        this._renewStates = [];
        this._saveItem(this.CONSTANTS.STORAGE.USERNAME, "");
        this._saveItem(this.CONSTANTS.STORAGE.IDTOKEN, "");
        this._saveItem(this.CONSTANTS.STORAGE.ERROR, "");
        this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, "");
        let keys: string|Array<string> = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS);

        if (!this._isEmpty(keys)) {
            keys = keys.split(this.CONSTANTS.RESOURCE_DELIMETER);
            for (let i = 0; i < keys.length; i++) {
                this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + keys[i], "");
                this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + keys[i], 0);
            }
        }
        this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, "");
    }

    public clearCacheForResource(resource: string): void {
        this._saveItem(this.CONSTANTS.STORAGE.STATE_RENEW, "");
        this._saveItem(this.CONSTANTS.STORAGE.ERROR, "");
        this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, "");
        if (this._hasResource(resource)) {
            this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, "");
            this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, 0);
        }
    }
}