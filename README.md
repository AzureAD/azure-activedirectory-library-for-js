azure-activedirectory-library-for-js
====================================
This library supports regular javascript usage and angular.js usage. 

**Usage in angular**
1- Include reference to angular.js libraries and adal.js at your main app page.
2- include reference to adal module
```js
var app = angular.module('demoApp', ['ngRoute', 'AdalAngular']);
```
3- Configure the adal at config of your app
```js
// endpoint to resource mapping(optional)
    var endpoints = {
        "https://yourhost/api": "b6a68585-5287-45b2-ba82-383ba1f60932",
    };
adalAuthenticationServiceProvider.init(
        {
            // Config to specify endpoints and similar for your app
            tenant: "52d4b072-9470-49fb-8721-bc3a1c9912a1",
            clientId: "e9a5a8b6-8af7-4719-9821-0deef255f68e",
            instance: "https://login.windows-ppe.net/",
            //localLoginUrl: "/login",  // optional
            //redirectUri : "your site", optional
            endpoints: endpoints  // optional
        },
        $httpProvider   // pass http provider to inject request interceptor to attach tokens
        );
```
4- Define protected routes at config for the route definitions with keyword requireADLogin
```js
$routeProvider.
    when("/todoList", {
        controller: "todoListController",
        templateUrl: "/App/Views/todoList.html",
        requireADLogin: true
    });

```
5- Your service code will remain unchanged since interceptor will add tokens for you this endpoint. When user clicks for todoList link, it will be redirected to login page.

***Optioinal***
6- You can also put login/logout buttons and show userinfo. Userinfo is available at rootContext as follows:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Angular Adal Sample</title>
</head>
<body ng-app="adalDemo" ng-controller="homeController" ng-init="hmCtl.init()">
    <a href="#">Home</a>
    <a href="#/todoList">ToDo List</a>


    <!--These links are added to manage login/logout-->
    <div data-ng-model="userInfo">
        <span data-ng-hide="!userInfo.isAuthenticated">Welcome {{userInfo.userName}} </span>
        <button data-ng-hide="!userInfo.isAuthenticated" data-ng-click="logout()">Logout</button>
        <button data-ng-hide="userInfo.isAuthenticated" data-ng-click="login()">Login</button>

        <div>
            {{userInfo.loginError}}
        </div>
        <div>
            {{testMessage}}
        </div>
    </div>
    <div ng-view>
        Your view will appear here.
    </div>

    <script src="/Scripts/angular.min.js"></script>
    <script src="/Scripts/angular-route.min.js"></script>
    <script src="/Scripts/adal.js"></script>
    <script src="App/Scripts/app.js"></script>
    <script src="App/Scripts/homeController.js"></script>
    <script src="App/Scripts/todoDetailController.js"></script>
    <script src="App/Scripts/todoListController.js"></script>
    <script src="App/Scripts/todoService.js"></script>
</body>
</html>
```
7- Controller can declare the login and logout methods similar to this:
```js
'use strict';
app.controller('homeController', ['$scope', '$location', 'adalAuthenticationService', function ($scope, $location, adalAuthenticationService) {
    // this is referencing adal module to do login

    //userInfo is defined at the $rootscope with adalAngular module
    $scope.testMessage = "";
    $scope.init = function () {
        $scope.testMessage = "";
    };

    $scope.logout = function () {
        adalAuthenticationService.logOut();
    };

    $scope.login = function () {
        adalAuthenticationService.login();
    };

    // optional
    $scope.$on("adal:loginSuccess", function () {
        $scope.testMessage = "loginSuccess";
    });

    // optional
    $scope.$on("adal:loginFailure", function () {
        $scope.testMessage = "loginFailure";
        $location.path("/login");
    });

    // optional
    $scope.$on("adal:notAuthorized", function (event, rejection, forResource) {
        $scope.testMessage = "It is not Authorized for resource:" + forResource;
    });
  
}]);


```

8- You have access to user data from userInfo at rootScope level. You can access all fields with userInfo.profile.

9- Sending CORS requests in Angular

```js
        $http.defaults.useXDomain = true;
        delete $http.defaults.headers.common['X-Requested-With'];
```

** To run tests**
npm install
bower install
npm test
// angular tests
karma start

** documentation **
Install grunt and then call
grunt doc


Karma as test runner:
You need to install karma command line
npm install -g karma
npm install -g karma-cli
