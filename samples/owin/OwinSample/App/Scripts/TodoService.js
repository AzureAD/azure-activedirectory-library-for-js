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
app.factory('todoService', ['$http', function ($http) {
    var serviceFactory = {};

    var _getItems = function () {
        return $http.get('/api/Todo');
    };

    var _getItem = function (id) {
        return $http.get('/api/Todo/' + id);
    };

    var _postItem = function (item) {
        return $http.post('/api/Todo/', item);
    };

    var _updateItem = function (id, item) {
        return $http.put('/api/Todo/' + id, item);
    };

    var _deleteItem = function (id) {
        return $http.delete('/api/Todo/' + id);
    };

    serviceFactory.getItems = _getItems;
    serviceFactory.getItem = _getItem;
    serviceFactory.postItem = _postItem;
    serviceFactory.updateItem = _updateItem;
    serviceFactory.deleteItem = _deleteItem;

    return serviceFactory;
}]);