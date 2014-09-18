'use strict';
app.controller('TodoListController', ['$scope', '$location', 'TodoService', function ($scope, $location, TodoService) {
    $scope.error = "";
    $scope.TodoList = null;
    $scope.Populate = function () {
        TodoService.getItems().success(function (results) {
            $scope.TodoList = results;
        }).error(function (err) {
            $scope.error = err;
        })
    };

}]);