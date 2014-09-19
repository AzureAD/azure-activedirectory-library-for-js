'use strict';
app.controller('HomeController', ['$scope', '$location', 'TokenService', function ($scope, $location, TokenService) {
    // this is referencing adal module to do login
    $scope.adalAuthData = TokenService.oauthData("");
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

    $scope.$on("adal:loginSuccess", function(){
        console.log("scope gets event login sucsses");
    });

    $scope.$on("adal:loginFailure", function () {
        console.log("scope gets event loginFailure");
    });

    $scope.initAuth = function () {
        

        //// Scope needs to be updated form controller to update username in the text.
        //// this does not get updated inside the TokenService
        //TokenService.getUser().then(function (username) {
        //    $scope.adalAuthData.userName = username;
        //}, function (reason) {
        //    console.log("User is not available:" + reason);
        //    $scope.adalAuthData.userName = null;
        //});
    };
}]);