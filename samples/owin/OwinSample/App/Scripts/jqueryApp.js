//----------------------------------------------------------------------
// Copyright (c) Microsoft Open Technologies, Inc.
// All Rights Reserved
// Apache License 2.0
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//----------------------------------------------------------------------
'use strict'
// sample code to show usage of adal in non-angular app that does ajax calls

var todos = [];
var adal;
var activeUser = null;
var testResource = 'b6a68585-5287-45b2-ba82-383ba1f60932';
$(document).ready(function () {
    adal = new AuthenticationContext({
        // Config to specify endpoints and similar for your app
        tenant: "52d4b072-9470-49fb-8721-bc3a1c9912a1",
        clientId: "44d0ebf6-0eef-4186-89c2-7edce2fb3964",
        instance: "https://login.windows-ppe.net/",
        redirectUri: window.location
    });
    $('.authenticated').hide();
    $('.notauthenticated').show();

    // handle the redirect at the same page for iframe and login redirect
    if (adal.isCallback(window.location.hash)) {
        adal.handleWindowCallback();
    }

    adal.getUser(function (err, user) {
        if (user) {
            $('#welcomeText').text('Welcome ' + user.userName);
            activeUser = user;
            $('.authenticated').show();
            $('.notauthenticated').hide();
            refreshItems();
        } else {
            console.log('Need to login');
            $('.authenticated').hide();
            $('.notauthenticated').show();
        }
    });
});

$(document).ajaxStart(function () {
    $('#wait').css('display', 'inline');
});
$(document).ajaxComplete(function () {
    $('#wait').css('display', 'none');
});

function login() {
    adal.login();
}

function logout() {
    adal.logOut();
}

function renewTest() {
    var user = adal.getCachedUser();

    // clear flag for tests
    adal._saveItem(adal.CONSTANTS.STORAGE.FAILED_RENEW, '');
    adal.acquireToken(testResource, function (err, token) {
        if (token) {
            console.log('Token is received:' + token);
        }
    });
}

function renewIdTokenTest() {
    var user = adal.getCachedUser();

    // clear flag for tests
    adal._saveItem(adal.CONSTANTS.STORAGE.FAILED_RENEW, '');
    adal._renewIdToken(function (err, token) {
        if (token) {
            console.log('Token is received:' + token);
        }
    });
}

function deleteTodo(id) {
    handleItemDelete(id);
}

function addNew() {
    $('#displayList').hide();
    $('#displayEdit').text('');
    $('#displayEdit').show();

    var todo = new TodoItem(0, '', '');
    $('#todoTemplateEdit').tmpl(todo)
        .appendTo('#displayEdit');
}

function edit(id) {
    $('#displayList').hide();
    $('#displayEdit').text('');
    $('#displayEdit').show();

    handleItemGet(id, function (result) {
        var convertedItem = new TodoItem(result.TodoItemId, result.Title, result.Content);
        $('#todoTemplateEdit').tmpl(convertedItem)
       .appendTo('#displayEdit');
    });
}

function saveTodo(id) {
    // submitting the form content
    var item = new TodoItem(id, $("#editForm input[name='title']").val(), $("#editForm input[name='content']").val());
    item.Completed = $("#editForm input[name='completed']").is(':checked');
    if (item.Title) {
        if (id) {
            handleItemEdit(id, item);
        } else {
            handleItemAdd(item);
        }
    }
}

function showList() {
    if (activeUser) {
        refreshItems();
    } else {
        adal.login();
    }
}

function refreshItems() {
    if (activeUser) {
        $('#displayEdit').hide();
        $('#displayList').show();
        handleItemGets();
    }
}

// ========  Service  ========
function handleServerError(jqXHR, status, err) {
    $('#serverIssues').text('Error: ' + err);
    if (jqXHR.status == 401 && jqXHR.getResponseHeader('WWW-Authenticate')) {
        $('#serverIssues').append('<p>You are not authorized</p>');
    }
}

function handleSuccessCommon(result) {
    refreshItems();
}

function getAjaxConfig() {
    var conf = {
        beforeSend: function (xhr) {
            // only sending for itself in this sample
            // need to look up resource for this endpoint
            var token = adal.getCachedToken(adal.config.clientId);
            if (token) {
                xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            }
        },
        success: handleSuccessCommon,
        error: handleServerError
    };

    return conf;
}

function sendServerRequest(ajaxConfig) {
    // target different resources based on target url
    var targetResourceForEndpoint = adal.config.clientId;

    // renew token if possible or redirect to login
    if (activeUser) {
        adal.acquireToken(targetResourceForEndpoint, function (err, token) {
            if (token) {
                // send request in async
                $.ajax(ajaxConfig);
            }
        });
    }
}
function handleItemEdit(id, todoItem) {
    var ajaxConfig = getAjaxConfig();
    ajaxConfig.url = '/api/Todo/' + id;
    ajaxConfig.type = 'PUT';
    ajaxConfig.data = todoItem;
    sendServerRequest(ajaxConfig);
}

function handleItemAdd(todoItem) {
    var ajaxConfig = getAjaxConfig();
    ajaxConfig.url = '/api/Todo/';
    ajaxConfig.type = 'POST';
    ajaxConfig.data = todoItem;
    sendServerRequest(ajaxConfig);
}

function handleItemDelete(id) {
    var ajaxConfig = getAjaxConfig();
    ajaxConfig.url = '/api/Todo/' + id;
    ajaxConfig.type = 'DELETE';
    sendServerRequest(ajaxConfig);
}

function handleItemGet(id, callback) {
    var ajaxConfig = getAjaxConfig();
    ajaxConfig.url = '/api/Todo/' + id;
    ajaxConfig.type = 'GET';
    ajaxConfig.success = callback;
    sendServerRequest(ajaxConfig);
}

function handleItemGets() {
    var ajaxConfig = getAjaxConfig();
    ajaxConfig.url = '/api/Todo/';
    ajaxConfig.type = 'GET';
    ajaxConfig.success = function (result) {
        todos = [];
        for (var i = 0; i < result.length; i++) {
            var convertedItem = new TodoItem(result[i].TodoItemId, result[i].Title, result[i].Content);
            todos.push(convertedItem);
        }

        $('#todoList').text('');
        $('#todoTemplate').tmpl(todos).appendTo('#todoList');
    };
    sendServerRequest(ajaxConfig);
}

// ========  Models  ========

var TodoItem = function (id, title, content) {
    this.TodoItemId = id;
    this.Title = title;
    this.Content = content;
    this.Completed = false;
}