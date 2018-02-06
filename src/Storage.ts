export class AdalStorage {

  _saveItem(key:string, obj:object, preserve:boolean) {    
    if (this.config && this.config.cacheLocation && this.config.cacheLocation === 'localStorage') {

        if (!this._supportsLocalStorage()) {
            this.info('Local storage is not supported');
            return false;
        }

        if (preserve) {
            var value = this._getItem(key) || '';
            localStorage.setItem(key, value + obj + this.CONSTANTS.CACHE_DELIMETER);
        }
        else {
            localStorage.setItem(key, obj);
        }

        return true;
    }

    // Default as session storage
    if (!this._supportsSessionStorage()) {
        this.info('Session storage is not supported');
        return false;
    }

    sessionStorage.setItem(key, obj);
    return true;
  };
    
  _getItem(key:string) {
    if (this.config && this.config.cacheLocation && this.config.cacheLocation === 'localStorage') {

        if (!this._supportsLocalStorage()) {
            this.info('Local storage is not supported');
            return null;
        }

        return localStorage.getItem(key);
    }

    // Default as session storage
    if (!this._supportsSessionStorage()) {
        this.info('Session storage is not supported');
        return null;
    }

    return sessionStorage.getItem(key);
  };
    
  _supportsLocalStorage() {
    try {
        if (!window.localStorage) return false; // Test availability
        window.localStorage.setItem('storageTest', 'A'); // Try write
        if (window.localStorage.getItem('storageTest') != 'A') return false; // Test read/write
        window.localStorage.removeItem('storageTest'); // Try delete
        if (window.localStorage.getItem('storageTest')) return false; // Test delete
        return true; // Success
    } catch (e) {
        return false;
    }
  };
    
  _supportsSessionStorage() {
    try {
      if (!window.sessionStorage) return false; // Test availability
      window.sessionStorage.setItem('storageTest', 'A'); // Try write
      if (window.sessionStorage.getItem('storageTest') != 'A') return false; // Test read/write
      window.sessionStorage.removeItem('storageTest'); // Try delete
      if (window.sessionStorage.getItem('storageTest')) return false; // Test delete
      return true; // Success
    } catch (e) {
      return false;
    }
  }

  clearCache() {
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
  }

  clearCacheForResource(resource:string) {
    this._saveItem(this.CONSTANTS.STORAGE.STATE_RENEW, '');
    this._saveItem(this.CONSTANTS.STORAGE.ERROR, '');
    this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, '');

    if (this._hasResource(resource)) {
        this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, '');
        this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, 0);
    }
  }

  getLoginError() {
    return this._getItem(this.CONSTANTS.STORAGE.LOGIN_ERROR);
  }

  _hasResource(key:string) {
    var keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS);
    return keys && !this._isEmpty(keys) && (keys.indexOf(key + this.CONSTANTS.RESOURCE_DELIMETER) > -1);
  }
}

export class Storage {// Singleton
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

  // add value to storage
  setItem(key: string, value: string): void {
    if (window[this._cacheLocation]) {
      window[this._cacheLocation].setItem(key, value);
    } else {
      throw new Error("localStorage and sessionStorage are not supported");
    }
  }

  // get one item by key from storage
  getItem(key: string): string {
    if (window[this._cacheLocation]) {
      return window[this._cacheLocation].getItem(key);
    } else {
      throw new Error("localStorage and sessionStorage are not supported");
    }
  }

  // remove value from storage
  removeItem(key: string): void {
    if (window[this._cacheLocation]) {
      return window[this._cacheLocation].removeItem(key);
    } else {
      throw new Error("localStorage and sessionStorage are not supported");
    }
  }

  // clear storage (remove all items from it)
  clear(): void {
    if (window[this._cacheLocation]) {
      return window[this._cacheLocation].clear();
    } else {
      throw new Error("localStorage and sessionStorage are not supported");
    }
  }
}
