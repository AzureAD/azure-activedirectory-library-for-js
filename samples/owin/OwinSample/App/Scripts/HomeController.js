'use strict';
app.controller('HomeController', ['$scope', '$location', 'TokenService', function ($scope, $location, TokenService) {
    // this is referencing adal module to do login
    $scope.adalAuthData = TokenService.oauthData;
    $scope.testMessage = "";
    $scope.logout = function () {
        TokenService.logOut();
    };

    $scope.login = function () {
        TokenService.login();
    };

    // to test token renewing with iframe
    $scope.renew = function () {
        TokenService.acquireToken().then(function (token) {
            $scope.testMessage = "Renewed token:" + token;
        }, function (reason) {
            $scope.testMessage = "Token renewable failed";
        });
    };

    $scope.$on("adal:loginSuccess", function () {
        console.log("scope gets event login sucsses");
        $location.path("/home");
    });

    $scope.$on("adal:loginFailure", function () {
        console.log("scope gets event loginFailure");
    });

}]);