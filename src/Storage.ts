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

  setItem(key:string, obj:object, preserve:boolean) {
    if (window[this._cacheLocation]) {
      if (preserve) {
        let value = this.getItem(key);
        window[this._cacheLocation].setItem(key, value + obj + this.CONSTANTS.CACHE_DELIMETER); 
      } else {
        window[this._cacheLocation].setItem(key, obj);
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
    this.setItem(this.CONSTANTS.STORAGE.STATE_RENEW, '');
    this.setItem(this.CONSTANTS.STORAGE.ERROR, '');
    this.setItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');

    if (this._hasResource(resource)) {
        this.setItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, '');
        this.setItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, 0);
    }
  }

  getLoginError() {
    return this.getItem(this.CONSTANTS.STORAGE.LOGIN_ERROR);
  }

  hasResource(key:string) {
    var keys = this.getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS);
    return keys && !this._isEmpty(keys) && (keys.indexOf(key + this.CONSTANTS.RESOURCE_DELIMETER) > -1);
  }
}
