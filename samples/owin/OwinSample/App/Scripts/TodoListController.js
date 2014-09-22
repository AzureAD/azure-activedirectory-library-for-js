'use strict';
app.controller('TodoListController', ['$scope', '$location', 'TodoService', function ($scope, $location, TodoService) {
    $scope.error = "";
    $scope.loadingMsg = "Loading...";
    $scope.TodoList = null;
    $scope.Populate = function () {
        TodoService.getItems().success(function (results) {
            $scope.TodoList = results;
            $scope.loadingMsg = "";
        }).error(function (err) {
            $scope.error = err;
            $scope.loadingMsg = "";
        })
    };

}]);