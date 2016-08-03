/// <reference path="../typings/index.d.ts" />

import { Injectable, NgModule, ModuleWithProviders } from '@angular/core';
import { HttpModule, Http, ConnectionBackend, Request, RequestOptions, RequestOptionsArgs, Response, XHRBackend, Headers } from '@angular/http';
import { Observable } from 'rxjs/RX';

'use strict';

export interface AdalUser {
    userName: string;
    profile: any;
}

export declare class AuthenticationContext {
    _renewActive: boolean;
    constructor(config: AdalConfig);
    login();
    getCachedToken(resource: string): string;
    getCachedUser(): AdalUser;
    acquireToken(resource: string, callback: (error?: string, token?: string) => void);
    clearCache();
    clearCacheForResource(resource: string);
    logout();
    getUser(callback: (error?: string, user?: AdalUser) => void);
    isCallback(hash: string): boolean;
    getLoginError(): string;
    getResourceForEndpoint(endpoint: string): string;
}

export interface AdalConfig {
    tenant?: string;
    clientId?: string;
    redirectUri?: string;
    instance?: string;
    endpoints?: any[];
}

@Injectable()
export class AdalHttp extends Http {
    constructor(backend: ConnectionBackend, defaultOptions: RequestOptions, protected adal: AdalAuthenticationService) {
        super(backend, defaultOptions);
    }

    protected mergeOptions(url: string | Request, options?: RequestOptionsArgs): Observable<RequestOptionsArgs> {
        return Observable.create(observer => {

            let resourceUrl = (url instanceof Request) ? url.url : url;

            this.adal.acquireToken(resourceUrl)
                .subscribe(token => {
                    // Combine constructor default options with request options
                    let mergedOptions: RequestOptionsArgs;
                    if (this._defaultOptions) {
                        mergedOptions = Object.assign({}, this._defaultOptions);
                    } else {
                        mergedOptions = new RequestOptions();
                    }
                    if (!mergedOptions.headers) {
                        mergedOptions.headers = new Headers();
                    }

                    if (options) {
                        options.headers.forEach((values, name, headers) => {
                            mergedOptions.headers.set(name, values);
                        });
                        mergedOptions.method = options.method;
                        mergedOptions.body = options.body;
                        mergedOptions.search = options.search;
                    }
                    
                    mergedOptions.headers.set('Authorization', `Bearer ${token}`);
                    observer.next(mergedOptions);
                }, error => {
                    observer.error(error);
                });
        });
    }

      /**
   * Performs any type of http request. First argument is required, and can either be a url or
   * a {@link Request} instance. If the first argument is a url, an optional {@link RequestOptions}
   * object can be provided as the 2nd argument. The options object will be merged with the values
   * of {@link BaseRequestOptions} before performing the request.
   */
    request(url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
        return this.mergeOptions(url, options)
            .flatMap<Response>(requestOptions => {
                if (!requestOptions.body) {
                    requestOptions.body = '';
                }    
                return super.request(url, requestOptions);
            });
    }

    /**
     * Performs a request with `get` http method.
     */
    get(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return this.mergeOptions(url, options)
            .flatMap<Response>(requestOptions => {
                if (!requestOptions.body) {
                    requestOptions.body = '';
                }
                return super.get(url, requestOptions);
            });
    }

    /**
     * Performs a request with `post` http method.
     */
    post(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
        return this.mergeOptions(url, options)
            .flatMap<Response>(requestOptions => {
                return super.post(url, body, requestOptions);
            });        
    }

    /**
     * Performs a request with `put` http method.
     */
    put(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
        return this.mergeOptions(url, options)
            .flatMap<Response>(requestOptions => {
                return super.put(url, body, requestOptions);
            });        
    }

    /**
     * Performs a request with `delete` http method.
     */
    delete(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return this.mergeOptions(url, options)
            .flatMap<Response>(requestOptions => {
                return super.delete(url, requestOptions);
            });        
    }

    /**
     * Performs a request with `patch` http method.
     */
    patch(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
        return this.mergeOptions(url, options)
            .flatMap<Response>(requestOptions => {
                return super.patch(url, body, requestOptions);
            });        
    }

    /**
     * Performs a request with `head` http method.
     */
    head(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return this.mergeOptions(url, options)
            .flatMap<Response>(requestOptions => {
                return super.head(url, requestOptions);
            });        
    }
}

@Injectable()
export class AdalAuthenticationService {
    protected _adal: AuthenticationContext;
    constructor(protected config: AdalConfig) {
        this._adal = new AuthenticationContext(config);
    }

    logout() {
        this._adal.logout();
    }

    getCachedToken(resource: string): string {
        return this._adal.getCachedToken(resource);
    }

    acquireToken(url: string): Observable<string> {
        const resource = this._adal.getResourceForEndpoint(url);

        return Observable.create(observer => {
            this._adal._renewActive = true;
            this._adal.acquireToken(resource, (error, token) => {
                this._adal._renewActive = false;
                if (error) {
                    observer.error(error);
                } else {
                    observer.next(token);
                }
            });
        });
    }

    getUser(): Observable<AdalUser> {
        return Observable.create(observer => {
            this._adal.getUser((error, user) => {
                if (error) {
                    observer.error(error);
                } else {
                    observer.next(user);
                }
            });
        })
    }
}

export function provideAdalAuth(config?: AdalConfig): any[] {
    return [
        { provide: AdalAuthenticationService, useFactory: () => new AdalAuthenticationService(config) },
        { provide: Http, useFactory: (connectionBackend: XHRBackend, defaultOptions: RequestOptions, authService: AdalAuthenticationService) => {
            return new AdalHttp(connectionBackend, defaultOptions, authService);
        }, deps: [XHRBackend, RequestOptions, AdalAuthenticationService] }
    ];
}

@NgModule({
    imports: [HttpModule]
})
export class AdalModule {
    static withConfig(config?: AdalConfig): ModuleWithProviders {
        return {
            ngModule: AdalModule,
            providers: [
                provideAdalAuth(config)
            ]
        }
    }
}