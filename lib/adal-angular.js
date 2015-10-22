//----------------------------------------------------------------------
// AdalJS-Experimental v2.0.0-experimental
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
'use strict';

if (typeof module !== 'undefined' && module.exports) {
    module.exports.inject = function (conf) {
        return new AuthenticationContext(conf);
    };
}


(function () {
    // ============= Angular modules- Start =============
    if (angular) {
        
        var AdalModule = angular.module('AdalAngular', []);
        
        AdalModule.provider('adalAuthenticationService', function () {
            var _adal = null;
            var _oauthData = { isAuthenticated: false, userName: '', loginError: '', profile: '' };
            
            var updateDataFromCache = function (scopes) {
                // only cache lookup here to not interrupt with events
                if (scopes === _adal.config.clientId) {
                    scopes = [_adal.config.clientId];
                }
                _adal._validateInputScope(scopes);
                
                var token = _adal.getCachedToken(scopes);
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
                updateDataFromCache(_adal.config.clientId);
            };
            
            // special function that exposes methods in Angular controller
            // $rootScope, $window, $q, $location, $timeout are injected by Angular
            this.$get = ['$rootScope', '$window', '$q', '$location', '$timeout', function ($rootScope, $window, $q, $location, $timeout) {
                    
                    var locationChangeHandler = function () {
                        var hash = $window.location.hash;
                        
                        if (_adal.isCallback(hash)) {
                            // callback can come from login or iframe request
                            
                            var requestInfo = _adal.getRequestInfo(hash);
                            _adal.saveTokenFromHash(requestInfo);
                            
                            if ($location.$$html5) {
                                $window.location = $window.location.origin + $window.location.pathname;
                            } else {
                                $window.location.hash = '';
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
                                    // Call within the same context without full page redirect keeps the callback
                                    if (requestInfo.requestType === _adal.REQUEST_TYPE.RENEW_TOKEN) {
                                        // Idtoken or Accestoken can be renewed
                                        if (requestInfo.parameters['access_token']) {
                                            _adal.callback(_adal._getItem(_adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters['access_token']);
                                            return;
                                        } else if (requestInfo.parameters['id_token']) {
                                            _adal.callback(_adal._getItem(_adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters['id_token']);
                                            return;
                                        }
                                    }
                                } else {
                                    // normal full login redirect happened on the page
                                    updateDataFromCache(_adal.config.clientId);
                                    if (_oauthData.userName) {
                                        //IDtoken is added as token for the app
                                        $timeout(function () {
                                            updateDataFromCache(_adal.config.clientId);
                                            $rootScope.userInfo = _oauthData;
                                            // redirect to login requested page
                                            var loginStartPage = _adal._getItem(_adal.CONSTANTS.STORAGE.START_PAGE);
                                            if (loginStartPage) {
                                                $location.path(loginStartPage);
                                            }
                                        }, 1);
                                        $rootScope.$broadcast('adal:loginSuccess');
                                    } else {
                                        $rootScope.$broadcast('adal:loginFailure', _adal._getItem(_adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION));
                                    }
                                }
                            }
                        } else {
                            // No callback. App resumes after closing or moving to new page.
                            // Check token and username    
                            _adal.log(_adal.config.clientId, 'No callback. App resumes after closing or moving to new page.');
                            updateDataFromCache(_adal.config.clientId);
                            if (!_adal._renewActive && !_oauthData.isAuthenticated && _oauthData.userName) {
                                if (!_adal._getItem(_adal.CONSTANTS.STORAGE.FAILED_RENEW)) {
                                    // Idtoken is expired or not present
                                    _adal.acquireTokenSilent(_adal.config.clientId, null, function (error, tokenOut) {
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
                        }
                        
                        $timeout(function () {
                            // It is setting the idtoken to rootscope. 
                            updateDataFromCache(_adal.config.clientId);
                            $rootScope.userInfo = _oauthData;
                        }, 1);
                    };
                    
                    var loginHandler = function () {
                        _adal._logstatus('Login event for:' + $location.$$path);
                        if (_adal.config && _adal.config.localLoginUrl) {
                            $location.path(_adal.config.localLoginUrl);
                        } else {
                            // directly start login flow
                            _adal._saveItem(_adal.CONSTANTS.STORAGE.START_PAGE, $location.$$path);
                            _adal._logstatus('Start login at:' + window.location.href);
                            $rootScope.$broadcast('adal:loginRedirect');
                            _adal.login(null);
                        }
                    };
                    
                    function isADLoginRequired(route, global) {
                        return global.requireADLogin ? route.requireADLogin !== false : !!route.requireADLogin;
                    }
                    
                    var routeChangeHandler = function (e, nextRoute) {
                        if (nextRoute && nextRoute.$$route && isADLoginRequired(nextRoute.$$route, _adal.config)) {
                            if (!_oauthData.isAuthenticated) {
                                _adal._logstatus('Route change event for:' + $location.$$path);
                                loginHandler();
                            }
                        }
                    };
                    
                    var stateChangeHandler = function (e, nextRoute) {
                        if (nextRoute && isADLoginRequired(nextRoute, _adal.config)) {
                            if (!_oauthData.isAuthenticated) {
                                _adal._logstatus('State change event for:' + $location.$$path);
                                loginHandler();
                            }
                        }
                    };
                    
                    // Route change event tracking to receive fragment and also auto renew tokens
                    $rootScope.$on('$routeChangeStart', routeChangeHandler);
                    
                    $rootScope.$on('$stateChangeStart', stateChangeHandler);
                    
                    $rootScope.$on('$locationChangeStart', locationChangeHandler);
                    
                    updateDataFromCache(_adal.config.clientId);
                    $rootScope.userInfo = _oauthData;
                    
                    return {
                        // public methods will be here that are accessible from Controller
                        config: _adal.config,
                        login: function (scopes) {
                            _adal.login(scopes);
                        },
                        loginInProgress: function () {
                            return _adal.loginInProgress();
                        },
                        logOut: function () {
                            _adal.logOut();
                        //call signout related method
                        },
                        getCachedToken: function (scopes) {
                            return _adal.getCachedToken(scopes);
                        },
                        userInfo: _oauthData,
                        acquireTokenSilent: function (scopes) {
                            // automated token request call
                            var deferred = $q.defer();
                            _adal.acquireTokenSilent(scopes, function (error, tokenOut) {
                                if (error) {
                                    _adal._logstatus('err :' + error);
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
                                    _adal._logstatus('err :' + error);
                                    deferred.reject(error);
                                } else {
                                    deferred.resolve(user);
                                }
                            });
                            
                            return deferred.promise;
                        },
                        getScopesForEndpoint: function (endpoint) {
                            return _adal.getScopesForEndpoint(endpoint);
                        },
                        clearCache: function () {
                            _adal.clearCache();
                        },
                        clearCacheForStoredEntry: function (scope) {
                            _adal.clearCacheForStoredEntry(scope);
                        }, 
                        log: function (scopes, message) {
                            _adal.log(scopes, message);
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
                            
                            var scope = authService.getScopesForEndpoint(config.url);
                            
                            var tokenStored = authService.getCachedToken(scope);
                            var isEndpoint = false;
                            if (tokenStored) {
                                authService.log(scope, 'Token is avaliable for this url ' + config.url);
                                // check endpoint mapping if provided
                                config.headers.Authorization = 'Bearer ' + tokenStored;
                                return config;
                            } else {
                                
                                if (authService.config) {
                                    for (var endpointUrl in authService.config.endpoints) {
                                        if (config.url.indexOf(endpointUrl) > -1) {
                                            isEndpoint = true;
                                        }
                                    }
                                }
                                
                                // Cancel request if login is starting
                                if (authService.loginInProgress()) {
                                    authService.log(scope, 'login already start.');
                                    return $q.reject();
                                } else if (authService.config && isEndpoint) {
                                    // external endpoints
                                    // delayed request to return after iframe completes
                                    var delayedRequest = $q.defer();
                                    authService.acquireTokenSilent(scope).then(function (token) {
                                        authService.log(scope, 'Token is avaliable');
                                        config.headers.Authorization = 'Bearer ' + token;
                                        delayedRequest.resolve(config);
                                    }, function (err) {
                                        delayedRequest.reject(err);
                                    });
                                    
                                    return delayedRequest.promise;
                                }
                            }
                            
                            return config;
                        }
                    },
                    responseError: function (rejection) {
                        authService.log(null, 'Getting error in the response');
                        if (rejection && rejection.status === 401) {
                            var scopes = authService.getScopesForEndpoint(rejection.config.url);
                            
                            authService.clearCacheForStoredEntry(scopes);
                            $rootScope.$broadcast('adal:notAuthorized', rejection, scopes);
                        }
                        
                        return $q.reject(rejection);
                    }
                };
            }]);
    } else {
        console.error('Angular.JS is not included');
    }
}());
