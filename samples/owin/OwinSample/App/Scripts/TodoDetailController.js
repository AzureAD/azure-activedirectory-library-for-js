//----------------------------------------------------------------------
// Copyright (c) Microsoft Open Technologies, Inc.
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
app.controller('todoDetailController', ['$scope', '$location', '$routeParams', 'todoService', function ($scope, $location, $routeParams, todoService) {
    $scope.param = $routeParams.param || 1;
    $scope.todo = { todoItemId: $scope.param };
    $scope.populate = function () {
        todoService.getItem($scope.param).then(function (result) {
            $scope.todo = result.data;
        });
    };

    $scope.save = function () {
        todoService.updateItem($scope.param, $scope.todo).then(function (result) {
            $location.path("/todoList");
        }, function (err) {
            $scope.error = err;
        });
    }

    $scope.add = function () {
        todoService.postItem($scope.todo).then(function (result) {
            $location.path("/todoList");
        }, function (err) {
            $scope.error = err.data;
        });
    }
}]);