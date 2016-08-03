/// <reference path="../typings/index.d.ts" />
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var core_1 = require('@angular/core');
var http_1 = require('@angular/http');
var RX_1 = require('rxjs/RX');
'use strict';
var AdalHttp = (function (_super) {
    __extends(AdalHttp, _super);
    function AdalHttp(backend, defaultOptions, adal) {
        _super.call(this, backend, defaultOptions);
        this.adal = adal;
    }
    AdalHttp.prototype.mergeOptions = function (url, options) {
        var _this = this;
        return RX_1.Observable.create(function (observer) {
            var resourceUrl = (url instanceof http_1.Request) ? url.url : url;
            _this.adal.acquireToken(resourceUrl)
                .subscribe(function (token) {
                // Combine constructor default options with request options
                var mergedOptions;
                if (_this._defaultOptions) {
                    mergedOptions = Object.assign({}, _this._defaultOptions);
                }
                else {
                    mergedOptions = new http_1.RequestOptions();
                }
                if (!mergedOptions.headers) {
                    mergedOptions.headers = new http_1.Headers();
                }
                if (options) {
                    options.headers.forEach(function (values, name, headers) {
                        mergedOptions.headers.set(name, values);
                    });
                    mergedOptions.method = options.method;
                    mergedOptions.body = options.body;
                    mergedOptions.search = options.search;
                }
                mergedOptions.headers.set('Authorization', "Bearer " + token);
                observer.next(mergedOptions);
            }, function (error) {
                observer.error(error);
            });
        });
    };
    /**
 * Performs any type of http request. First argument is required, and can either be a url or
 * a {@link Request} instance. If the first argument is a url, an optional {@link RequestOptions}
 * object can be provided as the 2nd argument. The options object will be merged with the values
 * of {@link BaseRequestOptions} before performing the request.
 */
    AdalHttp.prototype.request = function (url, options) {
        var _this = this;
        return this.mergeOptions(url, options)
            .flatMap(function (requestOptions) {
            if (!requestOptions.body) {
                requestOptions.body = '';
            }
            return _super.prototype.request.call(_this, url, requestOptions);
        });
    };
    /**
     * Performs a request with `get` http method.
     */
    AdalHttp.prototype.get = function (url, options) {
        var _this = this;
        return this.mergeOptions(url, options)
            .flatMap(function (requestOptions) {
            if (!requestOptions.body) {
                requestOptions.body = '';
            }
            return _super.prototype.get.call(_this, url, requestOptions);
        });
    };
    /**
     * Performs a request with `post` http method.
     */
    AdalHttp.prototype.post = function (url, body, options) {
        var _this = this;
        return this.mergeOptions(url, options)
            .flatMap(function (requestOptions) {
            return _super.prototype.post.call(_this, url, body, requestOptions);
        });
    };
    /**
     * Performs a request with `put` http method.
     */
    AdalHttp.prototype.put = function (url, body, options) {
        var _this = this;
        return this.mergeOptions(url, options)
            .flatMap(function (requestOptions) {
            return _super.prototype.put.call(_this, url, body, requestOptions);
        });
    };
    /**
     * Performs a request with `delete` http method.
     */
    AdalHttp.prototype.delete = function (url, options) {
        var _this = this;
        return this.mergeOptions(url, options)
            .flatMap(function (requestOptions) {
            return _super.prototype.delete.call(_this, url, requestOptions);
        });
    };
    /**
     * Performs a request with `patch` http method.
     */
    AdalHttp.prototype.patch = function (url, body, options) {
        var _this = this;
        return this.mergeOptions(url, options)
            .flatMap(function (requestOptions) {
            return _super.prototype.patch.call(_this, url, body, requestOptions);
        });
    };
    /**
     * Performs a request with `head` http method.
     */
    AdalHttp.prototype.head = function (url, options) {
        var _this = this;
        return this.mergeOptions(url, options)
            .flatMap(function (requestOptions) {
            return _super.prototype.head.call(_this, url, requestOptions);
        });
    };
    AdalHttp = __decorate([
        core_1.Injectable(), 
        __metadata('design:paramtypes', [http_1.ConnectionBackend, http_1.RequestOptions, AdalAuthenticationService])
    ], AdalHttp);
    return AdalHttp;
}(http_1.Http));
exports.AdalHttp = AdalHttp;
var AdalAuthenticationService = (function () {
    function AdalAuthenticationService(config) {
        this.config = config;
        this._adal = new AuthenticationContext(config);
    }
    AdalAuthenticationService.prototype.logout = function () {
        this._adal.logout();
    };
    AdalAuthenticationService.prototype.getCachedToken = function (resource) {
        return this._adal.getCachedToken(resource);
    };
    AdalAuthenticationService.prototype.acquireToken = function (url) {
        var _this = this;
        var resource = this._adal.getResourceForEndpoint(url);
        return RX_1.Observable.create(function (observer) {
            _this._adal._renewActive = true;
            _this._adal.acquireToken(resource, function (error, token) {
                _this._adal._renewActive = false;
                if (error) {
                    observer.error(error);
                }
                else {
                    observer.next(token);
                }
            });
        });
    };
    AdalAuthenticationService.prototype.getUser = function () {
        var _this = this;
        return RX_1.Observable.create(function (observer) {
            _this._adal.getUser(function (error, user) {
                if (error) {
                    observer.error(error);
                }
                else {
                    observer.next(user);
                }
            });
        });
    };
    AdalAuthenticationService = __decorate([
        core_1.Injectable(), 
        __metadata('design:paramtypes', [Object])
    ], AdalAuthenticationService);
    return AdalAuthenticationService;
}());
exports.AdalAuthenticationService = AdalAuthenticationService;
function provideAdalAuth(config) {
    return [
        { provide: AdalAuthenticationService, useFactory: function () { return new AdalAuthenticationService(config); } },
        { provide: http_1.Http, useFactory: function (connectionBackend, defaultOptions, authService) {
                return new AdalHttp(connectionBackend, defaultOptions, authService);
            }, deps: [http_1.XHRBackend, http_1.RequestOptions, AdalAuthenticationService] }
    ];
}
exports.provideAdalAuth = provideAdalAuth;
var AdalModule = (function () {
    function AdalModule() {
    }
    AdalModule.withConfig = function (config) {
        return {
            ngModule: AdalModule,
            providers: [
                provideAdalAuth(config)
            ]
        };
    };
    AdalModule = __decorate([
        core_1.NgModule({
            imports: [http_1.HttpModule]
        }), 
        __metadata('design:paramtypes', [])
    ], AdalModule);
    return AdalModule;
}());
exports.AdalModule = AdalModule;
