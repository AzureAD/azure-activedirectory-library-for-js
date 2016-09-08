/// <reference path="../typings/index.d.ts" />
import { ModuleWithProviders } from '@angular/core';
import { Http, ConnectionBackend, Request, RequestOptions, RequestOptionsArgs, Response } from '@angular/http';
import { Observable } from 'rxjs/RX';
export interface AdalUser {
    userName: string;
    profile: any;
}
export declare class AuthenticationContext {
    _renewActive: boolean;
    constructor(config: AdalConfig);
    login(): any;
    getCachedToken(resource: string): string;
    getCachedUser(): AdalUser;
    acquireToken(resource: string, callback: (error?: string, token?: string) => void): any;
    clearCache(): any;
    clearCacheForResource(resource: string): any;
    logout(): any;
    getUser(callback: (error?: string, user?: AdalUser) => void): any;
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
export declare class AdalHttp extends Http {
    protected adal: AdalAuthenticationService;
    constructor(backend: ConnectionBackend, defaultOptions: RequestOptions, adal: AdalAuthenticationService);
    protected mergeOptions(url: string | Request, options?: RequestOptionsArgs): Observable<RequestOptionsArgs>;
    /**
 * Performs any type of http request. First argument is required, and can either be a url or
 * a {@link Request} instance. If the first argument is a url, an optional {@link RequestOptions}
 * object can be provided as the 2nd argument. The options object will be merged with the values
 * of {@link BaseRequestOptions} before performing the request.
 */
    request(url: string | Request, options?: RequestOptionsArgs): Observable<Response>;
    /**
     * Performs a request with `get` http method.
     */
    get(url: string, options?: RequestOptionsArgs): Observable<Response>;
    /**
     * Performs a request with `post` http method.
     */
    post(url: string, body: any, options?: RequestOptionsArgs): Observable<Response>;
    /**
     * Performs a request with `put` http method.
     */
    put(url: string, body: any, options?: RequestOptionsArgs): Observable<Response>;
    /**
     * Performs a request with `delete` http method.
     */
    delete(url: string, options?: RequestOptionsArgs): Observable<Response>;
    /**
     * Performs a request with `patch` http method.
     */
    patch(url: string, body: any, options?: RequestOptionsArgs): Observable<Response>;
    /**
     * Performs a request with `head` http method.
     */
    head(url: string, options?: RequestOptionsArgs): Observable<Response>;
}
export declare class AdalAuthenticationService {
    protected config: AdalConfig;
    protected _adal: AuthenticationContext;
    constructor(config: AdalConfig);
    logout(): void;
    getCachedToken(resource: string): string;
    acquireToken(url: string): Observable<string>;
    getUser(): Observable<AdalUser>;
}
export declare function provideAdalAuth(config?: AdalConfig): any[];
export declare class AdalModule {
    static withConfig(config?: AdalConfig): ModuleWithProviders;
}
