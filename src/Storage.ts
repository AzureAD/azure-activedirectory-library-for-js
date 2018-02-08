import { Constants } from "./Constants";
import { Utils } from "./Utils";

export class Storage {

  private static _instance: Storage;
  private _localStorageSupported: boolean;
  private _sessionStorageSupported: boolean;
  private _cacheLocation: string;

  constructor(cacheLocation: string) {
    if (Storage._instance) {
      return Storage._instance;
    }

    this._cacheLocation = cacheLocation;
    this._localStorageSupported = typeof window[this._cacheLocation] !== "undefined" && window[this._cacheLocation] != null;
    this._sessionStorageSupported = typeof window[cacheLocation] !== "undefined" && window[cacheLocation] != null;
    Storage._instance = this;
    if (!this._localStorageSupported && !this._sessionStorageSupported) {
      throw new Error("localStorage and sessionStorage not supported");
    }

    return Storage._instance;
  }

  setItem(key: string, value: string, preserve?: boolean) {
    if (window[this._cacheLocation]) {
      if (preserve) {
        let val = this.getItem(key);
        window[this._cacheLocation].setItem(key, value + val + Constants.CACHE_DELIMETER); 
      } else {
        window[this._cacheLocation].setItem(key, value);
      }        
    } else {  
      throw new Error("localStorage and sessionStorage are not supported");  
    }
  }
    
  getItem(key: string): string {
    if (window[this._cacheLocation]) {
      return window[this._cacheLocation].getItem(key);
    } else {
      throw new Error("localStorage and sessionStorage are not supported");
    }
  }

  clearCache(): void {
    if (window[this._cacheLocation]) {
      return window[this._cacheLocation].clear();
    } else {
      throw new Error("localStorage and sessionStorage are not supported");
    }
  }

  clearCacheForResource(resource:string) {
    this.setItem(Constants.STORAGE.STATE_RENEW, '');
    this.setItem(Constants.STORAGE.ERROR, '');
    this.setItem(Constants.STORAGE.ERROR_DESCRIPTION, '');

    if (this._hasResource(resource)) {
        this.setItem(Constants.STORAGE.ACCESS_TOKEN_KEY + resource, '');
        this.setItem(Constants.STORAGE.EXPIRATION_KEY + resource, 0);
    }
  }

  getLoginError() {
      return this.getItem(Constants.STORAGE.LOGIN_ERROR);
  }

  private _hasResource(key:string) {
      var keys = this.getItem(Constants.STORAGE.TOKEN_KEYS);
      return keys && !Utils.isEmpty(keys) && (keys.indexOf(key + Constants.RESOURCE_DELIMETER) > -1);
  }
}
