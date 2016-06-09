﻿//----------------------------------------------------------------------
// AdalJS v1.0.10
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

(function () {
    // ============= Angular modules- Start =============
    'use strict';

    if (typeof module !== 'undefined' && module.exports) {
        module.exports.inject = function (conf) {
            return new AuthenticationContext(conf);
        };
    }

    if (angular) {

        var AdalModule = angular.module('AdalAngular', []);

        AdalModule.provider('adalAuthenticationService', function () {
            var _adal = null;
            var _oauthData = { isAuthenticated: false, userName: '', loginError: '', profile: '' };

            var updateDataFromCache = function (resource) {
                // only cache lookup here to not interrupt with events
                var token = _adal.getCachedToken(resource);
                _oauthData.isAuthenticated = token !== null && token.length > 0;
                var user = _adal.getCachedUser() || { userName: '' };
                _oauthData.userName = user.userName;
                _oauthData.profile = user.profile;
                _oauthData.loginError = _adal.getLoginError();
            };

            this.init = function (configOptions, httpProvider) {
                if (configOptions) {
                    // redirect and logout_redirect are set to current location by default
                    var existingHash = window.location.hash;
                    var pathDefault = window.location.href;
                    if (existingHash) {
                        pathDefault = pathDefault.replace(existingHash, '');
                    }
                    configOptions.redirectUri = configOptions.redirectUri || pathDefault;
                    configOptions.postLogoutRedirectUri = configOptions.postLogoutRedirectUri || pathDefault;

                    if (httpProvider && httpProvider.interceptors) {
                        httpProvider.interceptors.push('ProtectedResourceInterceptor');
                    }

                    // create instance with given config
                    _adal = new AuthenticationContext(configOptions);
                } else {
                    throw new Error('You must set configOptions, when calling init');
                }

                // loginresource is used to set authenticated status
                updateDataFromCache(_adal.config.loginResource);
            };

            // special function that exposes methods in Angular controller
            // $rootScope, $window, $q, $location, $timeout are injected by Angular
            this.$get = ['$rootScope', '$window', '$q', '$location', '$timeout', function ($rootScope, $window, $q, $location, $timeout) {

                var locationChangeHandler = function (event, newUrl, oldUrl) {
                    var hash = $window.location.hash;

                    if (_adal.isCallback(hash)) {
                        // callback can come from login or iframe request

                        var requestInfo = _adal.getRequestInfo(hash);
                        _adal.saveTokenFromHash(requestInfo);

                        if ($location.$$html5) {
                            $window.location = $window.location.origin + $window.location.pathname;
                        } else {
                            $location.hash('');
                        }

                        if (requestInfo.requestType !== _adal.REQUEST_TYPE.LOGIN) {
                            _adal.callback = $window.parent.AuthenticationContext().callback;
                            if (requestInfo.requestType === _adal.REQUEST_TYPE.RENEW_TOKEN) {
                                _adal.callback = $window.parent.callBackMappedToRenewStates[requestInfo.stateResponse];
                            }
                        }

                        // Return to callback if it is send from iframe
                        if (requestInfo.stateMatch) {
                            if (typeof _adal.callback === 'function') {
                                // since this is a token renewal request in iFrame, we don't need to proceed with the location change.
                                event.preventDefault();

                                // Call within the same context without full page redirect keeps the callback
                                if (requestInfo.requestType === _adal.REQUEST_TYPE.RENEW_TOKEN) {
                                    // Idtoken or Accestoken can be renewed
                                    if (requestInfo.parameters['access_token']) {
                                        _adal.callback(_adal._getItem(_adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters['access_token']);
                                        return;
                                    } else if (requestInfo.parameters['id_token']) {
                                        _adal.callback(_adal._getItem(_adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters['id_token']);
                                        return;
                                    } else if (requestInfo.parameters['error']) {
                                        _adal.callback(_adal._getItem(_adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION), null);
                                        _adal._renewFailed = true;
                                        return;
                                    }
                                }
                            } else {
                                // normal full login redirect happened on the page
                                updateDataFromCache(_adal.config.loginResource);
                                if (_oauthData.userName) {
                                    //IDtoken is added as token for the app
                                    $timeout(function () {
                                        updateDataFromCache(_adal.config.loginResource);
                                        $rootScope.userInfo = _oauthData;
                                        // redirect to login requested page
                                        var loginStartPage = _adal._getItem(_adal.CONSTANTS.STORAGE.START_PAGE);
                                        if (loginStartPage) {
                                            $location.url(loginStartPage);
                                        }
                                    }, 1);
                                    $rootScope.$broadcast('adal:loginSuccess');
                                } else {
                                    $rootScope.$broadcast('adal:loginFailure', _adal._getItem(_adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION));
                                }
                            }
                        }
                        else {
                            // state did not match, broadcast an error
                            $rootScope.$broadcast('adal:stateMismatch', _adal._getItem(_adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION));
                        }
                    } else {
                        // No callback. App resumes after closing or moving to new page.
                        // Check token and username
                        updateDataFromCache(_adal.config.loginResource);
                        if (!_oauthData.isAuthenticated && _oauthData.userName && !_adal._renewActive && !_adal._renewFailed) {
                            // Idtoken is expired or not present
                            _adal._renewActive = true;
                            _adal.acquireToken(_adal.config.loginResource, function (error, tokenOut) {
                                _adal._renewActive = false;
                                if (error) {
                                    $rootScope.$broadcast('adal:loginFailure', 'auto renew failure');
                                } else {
                                    if (tokenOut) {
                                        _oauthData.isAuthenticated = true;
                                    }
                                }
                            });
                        }
                    }

                    $timeout(function () {
                        updateDataFromCache(_adal.config.loginResource);
                        $rootScope.userInfo = _oauthData;
                    }, 1);
                };

                var loginHandler = function () {
                    _adal.info('Login event for:' + $location.$$url);
                    if (_adal.config && _adal.config.localLoginUrl) {
                        $location.path(_adal.config.localLoginUrl);
                    }
                    else {
                        // directly start login flow
                        _adal._saveItem(_adal.CONSTANTS.STORAGE.START_PAGE, $location.$$url);
                        _adal.info('Start login at:' + window.location.href);
                        $rootScope.$broadcast('adal:loginRedirect');
                        _adal.login();
                    }
                };

                function isADLoginRequired(route, global) {
                    return global.requireADLogin ? route.requireADLogin !== false : !!route.requireADLogin;
                }

                function isAnonymousEndpoint(url) {
                    if (_adal.config && _adal.config.anonymousEndpoints) {
                        for (var i = 0; i < _adal.config.anonymousEndpoints.length; i++) {
                            if (url.indexOf(_adal.config.anonymousEndpoints[i]) > -1) {
                                return true;
                            }
                        }
                    }
                    return false;
                }

                var routeChangeHandler = function (e, nextRoute) {
                    if (nextRoute && nextRoute.$$route) {
                        if (isADLoginRequired(nextRoute.$$route, _adal.config)) {
                            if (!_oauthData.isAuthenticated && !_adal._renewActive && !_oauthData.loginError) {
                                _adal.info('Route change event for:' + $location.$$url);
                                loginHandler();
                            }
                        }
                        else {
                            if (nextRoute.$$route.templateUrl && !isAnonymousEndpoint(nextRoute.$$route.templateUrl)) {
                                _adal.config.anonymousEndpoints.push(nextRoute.$$route.templateUrl);
                            }
                        }
                    }
                };

                var stateChangeHandler = function (e, toState, toParams, fromState, fromParams) {
                    if (toState) {
                        if (isADLoginRequired(toState, _adal.config)) {
                            if (!_oauthData.isAuthenticated && !_adal._renewActive && !_oauthData.loginError) {
                                _adal.info('State change event for:' + $location.$$url);
                                loginHandler();
                            }
                        }
                        else {
                            if (toState.templateUrl && !isAnonymousEndpoint(toState.templateUrl)) {
                                _adal.config.anonymousEndpoints.push(toState.templateUrl);
                            }
                        }
                    }
                };

                // Route change event tracking to receive fragment and also auto renew tokens
                $rootScope.$on('$routeChangeStart', routeChangeHandler);

                $rootScope.$on('$stateChangeStart', stateChangeHandler);

                $rootScope.$on('$locationChangeStart', locationChangeHandler);

                updateDataFromCache(_adal.config.loginResource);
                $rootScope.userInfo = _oauthData;

                return {
                    // public methods will be here that are accessible from Controller
                    config: _adal.config,
                    login: function () {
                        loginHandler();
                    },
                    loginInProgress: function () {
                        return _adal.loginInProgress();
                    },
                    logOut: function () {
                        _adal.logOut();
                        //call signout related method
                    },
                    getCachedToken: function (resource) {
                        return _adal.getCachedToken(resource);
                    },
                    userInfo: _oauthData,
                    acquireToken: function (resource) {
                        // automated token request call
                        var deferred = $q.defer();
                        _adal._renewActive = true;
                        _adal.acquireToken(resource, function (error, tokenOut) {
                            _adal._renewActive = false;
                            if (error) {
                                _adal.error('Error when acquiring token for resource: ' + resource, error);
                                deferred.reject(error);
                            } else {
                                deferred.resolve(tokenOut);
                            }
                        });

                        return deferred.promise;
                    },
                    getUser: function () {
                        var deferred = $q.defer();
                        _adal.getUser(function (error, user) {
                            if (error) {
                                _adal.error('Error when getting user', error);
                                deferred.reject(error);
                            } else {
                                deferred.resolve(user);
                            }
                        });

                        return deferred.promise;
                    },
                    getResourceForEndpoint: function (endpoint) {
                        return _adal.getResourceForEndpoint(endpoint);
                    },
                    clearCache: function () {
                        _adal.clearCache();
                    },
                    clearCacheForResource: function (resource) {
                        _adal.clearCacheForResource(resource);
                    },
                    info: function (message) {
                        _adal.info(message);
                    },
                    verbose: function (message) {
                        _adal.verbose(message);
                    }
                };
            }];
        });

        // Interceptor for http if needed
        AdalModule.factory('ProtectedResourceInterceptor', ['adalAuthenticationService', '$q', '$rootScope', function (authService, $q, $rootScope) {

            return {
                request: function (config) {
                    if (config) {

                        // This interceptor needs to load service, but dependeny definition causes circular reference error.
                        // Loading with injector is suggested at github. https://github.com/angular/angular.js/issues/2367

                        config.headers = config.headers || {};
                        var resource = authService.getResourceForEndpoint(config.url);
                        authService.verbose('Url: ' + config.url + ' maps to resource: ' + resource);
                        if (resource === null) {
                            return config;
                        }
                        var tokenStored = authService.getCachedToken(resource);
                        if (tokenStored) {
                            authService.info('Token is available for this url ' + config.url);
                            // check endpoint mapping if provided
                            config.headers.Authorization = 'Bearer ' + tokenStored;
                            return config;
                        }
                        else {
                            // Cancel request if login is starting
                            if (authService.loginInProgress()) {
                                authService.info('login is in progress.');
                                config.data = 'login in progress, cancelling the request';
                                return $q.reject(config);
                            }
                            else if (authService.userInfo.loginError) {
                                authService.info('Error in logging in the user: ' + authService.userInfo.loginError);
                                config.data = 'Error in logging in the user, cancelling the request. Error: ' + authService.userInfo.loginError;
                                return $q.reject(config);
                            }
                            else {
                                // delayed request to return after iframe completes
                                var delayedRequest = $q.defer();
                                authService.acquireToken(resource).then(function (token) {
                                    authService.verbose('Token is available');
                                    config.headers.Authorization = 'Bearer ' + token;
                                    delayedRequest.resolve(config);
                                }, function (err) {
                                    config.data = err;
                                    delayedRequest.reject(config);
                                });

                                return delayedRequest.promise;
                            }
                        }

                        return config;
                    }
                },
                responseError: function (rejection) {
                    authService.info('Getting error in the response.');
                    if (rejection) {
                        if (rejection.status === 401) {
                            var resource = authService.getResourceForEndpoint(rejection.config.url);
                            authService.clearCacheForResource(resource);
                            $rootScope.$broadcast('adal:notAuthorized', rejection, resource);
                        }
                        else {
                            $rootScope.$broadcast('adal:errorResponse', rejection);
                        }
                        return $q.reject(rejection);
                    }
                }
            };
        }]);
    } else {
        console.error('Angular.JS is not included');
    }
}());
