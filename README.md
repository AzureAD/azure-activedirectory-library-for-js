azure-activedirectory-library-for-js
====================================
This library supports regular javascript usage and angular.js usage. 

**Usage in angular**
1- Include reference to angular.js libraries and adal.js at your main app page.
2- include reference to adal module
```js
var app = angular.module('bull', ['ngRoute', 'AdalAngular']);
```
3- Inject adal interceptor to your app to automatically append Tokens to the requests
```js
app.config(function ($httpProvider) {
    // Http call interceptor
    // Optional adal token interceptor is used here to intercept http request/response
    $httpProvider.interceptors.push('TokenInterceptor');
});
```
4- Add Login controller or similar to define functions for your login, logout links
```js
'use strict';
app.controller('HomeController', ['$scope', '$location', 'TokenService', function ($scope, $location, TokenService) {
    // this is referencing adal module to do login
    $scope.adalAuthData = { isAuthorized: false, userName: "", loginError: "" };
    $scope.logout = function () {
        TokenService.logOut();
    };

    $scope.login = function () {
        TokenService.login();
    };

    $scope.renew = function () {
        TokenService.acquireToken().then(function (username) {
            console.log("Renew is failed:" + reason);
        }, function (reason) {
            console.log("Renew is failed:" + reason);
        });
    };

    $scope.initAuth = function () {
        $scope.adalAuthData = TokenService.checkAuthorization("");

        // Scope needs to be updated form controller to update username in the text.
        // this does not get updated inside the TokenService
        TokenService.getUser().then(function (username) {
            $scope.adalAuthData.userName = username;
        }, function (reason) {
            console.log("User is not available:" + reason);
            $scope.adalAuthData.userName = null;
        });
    };
}]);

```
5- Your service code will remain unchanged since interceptor will add tokens for you.