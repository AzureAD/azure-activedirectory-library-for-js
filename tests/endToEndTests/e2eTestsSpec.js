
describe('E2ETests', function () {

    var keyVault = require('./keyVault');
    var passworkKey = 'MSIDLAB5-manNonMFA1';
    keyVault.getSecret(passworkKey, function (result) {
        settings.password = result.value;
    });
    var testsId = browser.params.testsId;
    beforeEach(function () {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
        browser.ignoreSynchronization = true;
        browser.get(settings.appUrl);
        removeItemLocalStorage('redirectUri');
        removeItemLocalStorage('popUp');
        var configButton = element(by.id("configButton"));
        configButton.click().then(function () {
            return clearStorage();
        }).then(function () {
            var logoutButton = element(by.id('logoutButton'));
            return logoutButton.isDisplayed();
        }).then(function (displayed) {
            if (displayed) {
                logout();
            }
        });

    });

    afterEach(function () {
        browser.getAllWindowHandles().then(function (handles) {
            expect(handles.length).toEqual(1);
        });
    });

    var settings = {
        appUrl: 'http://adaljsspa.azurewebsites.net/',
        instance: 'https://login.microsoftonline.com',
        tenant: 'd34a1bb7-3481-4d5f-8b94-f3cc27bf8eac',
        urlNavigate: this.instance + this.tenant + '/oauth2/authorize',
        assignedUser: 'manNonMFA1@msidlab5.onmicrosoft.com',
        unassignedUser: 'adaljstestuser1@rohit1.onmicrosoft.com',
        clientID: '3f4adad0-057c-47f4-99f1-6e2e78ad4f8e',
        AppIdExternalApi: 'c22b3114-88ce-48fc-b728-3591a2e420a6',
    };

    var Storage = {
        TOKEN_KEYS: 'adal.token.keys',
        ACCESS_TOKEN_KEY: 'adal.access.token.key',
        EXPIRATION_KEY: 'adal.expiration.key',
        STATE_LOGIN: 'adal.state.login',
        STATE_RENEW: 'adal.state.renew',
        NONCE_IDTOKEN: 'adal.nonce.idtoken',
        SESSION_STATE: 'adal.session.state',
        USERNAME: 'adal.username',
        IDTOKEN: 'adal.idtoken',
        ERROR: 'adal.error',
        ERROR_DESCRIPTION: 'adal.error.description',
        LOGIN_REQUEST: 'adal.login.request',
        LOGIN_ERROR: 'adal.login.error',
        RENEW_STATUS: 'adal.token.renew.status'
    };

    var urlChanged = function (oldUrl) {
        return function () {
            return browser.getCurrentUrl().then(function (newUrl) {
                return oldUrl != newUrl;
            });
        };
    };

    var getValueLocalStorage = function (key) {
        return browser.executeScript("return window.localStorage.getItem('" + key + "');");
    };

    var setValueLocalStorage = function (key, value) {
        return browser.executeScript("return window.localStorage.setItem('" + key + "','" + value + "');");
    };

    var removeItemLocalStorage = function (key, value) {
        return browser.executeScript("return window.localStorage.removeItem('" + key + "');");
    };

    var getStorage = function () {
        return browser.executeScript("return window.localStorage;");
    };

    var clearStorage = function () {
        return browser.executeScript("return window.localStorage.clear();");
    };

    var localStorageChanged = function (key, oldValue) {
        return function () {
            return browser.executeScript("return localStorage.getItem('" + key + "');").then(function (newValue) {
                return oldValue !== newValue;
            });
        };
    };

    var log = function (message) {
        console.log(message);
    }

    var EC = protractor.ExpectedConditions;

    var login = function (userName, password) {
        log("login method called");
        return browser.wait(signInPage(), 5000).then(function () {
            var loginId = element(by.id('cred_userid_inputtext'));
            var loginPassword = element(by.id('cred_password_inputtext'));
            var signInButton = element(by.id('cred_sign_in_button'));
            return browser.wait(EC.visibilityOf(loginId), 5000).then(function () {
                loginId.sendKeys(userName);
                loginId.sendKeys(protractor.Key.TAB);
                loginPassword.sendKeys(password);
                return browser.wait(EC.elementToBeClickable(signInButton), 5000, 'Sign in button is not clickable').then(function () {
                    return signInButton.click();
                });
            });
        });
    };

    var checkLoginState = function (userName, password) {
        var otherAccountLink = element(by.id('use_another_account_link'));
        return otherAccountLink.isPresent().then(function (result) {
            if (result) {
                return otherAccountLink.click().then(function () {
                    return login(userName, password);
                });
            }
            else {
                return login(userName, password);
            }
        });
    };

    var logout = function () {
        log("logout method called");
        return browser.wait(homePage(), 5000).then(function () {
            var logoutButton = element(by.id('logoutButton'));
            var loginButton = element(by.id('loginButton'));
            return browser.wait(EC.visibilityOf(logoutButton), 5000, 'Logout button is not displayed on the dom').then(function () {
                return logoutButton.click().then(function () {
                    return browser.wait(EC.visibilityOf(loginButton), 5000, 'Login button is not displayed on the dom');
                });
            });
        });

    };

    var validateLogin = function () {
        log("validating if login was successful");
        browser.wait(homePage(), 5000, 'login error occurred').then(function () {
            expect(element(by.id('logoutButton')).isDisplayed()).toBeTruthy();
            expect(element(by.id('loginButton')).isDisplayed()).not.toBeTruthy();
            expect(getValueLocalStorage(Storage.IDTOKEN)).not.toEqual('');
            expect(getValueLocalStorage(Storage.ACCESS_TOKEN_KEY + settings.clientID)).not.toEqual('');
            expect(getValueLocalStorage(Storage.ERROR)).toEqual('');
            expect(getValueLocalStorage(Storage.ERROR_DESCRIPTION)).toEqual('');
            expect(getValueLocalStorage(Storage.EXPIRATION_KEY)).not.toEqual('');
        });

    };

    var signInPage = function () {
        return function () {
            return browser.getTitle().then(function (title) {
                return title === 'Sign in to your account';
            });
        }
    };

    var homePage = function () {
        log("home page loaded");
        return function () {
            return browser.getTitle().then(function (title) {
                return title === 'Todo List: a SPA sample demonstrating Azure AD and ADAL JS';
            });
        }
    };

    it(':1: ' + 'should login using redirectflow and logout', function () {
        if (testsId && testsId.includes(1) == false) {
            console.log("test 1 skipped");
            return;
        }
        var loginButton = element(by.id('loginButton'));
        browser.wait(EC.visibilityOf(loginButton), 5000, 'Login button is not displayed on the dom').then(function () {
            return loginButton.click();
        }).then(function () {
            return browser.wait(signInPage(), 5000, 'Error navigating to Signin Page');
        }).then(function () {
            return checkLoginState(settings.assignedUser, settings.password);
        }).then(function () {
            return browser.wait(homePage(), 5000, 'Error navigating to home page after sign-in');
        }).then(function () {
            validateLogin();
            return logout();
        }).then(function () {
            expect(getValueLocalStorage(Storage.IDTOKEN)).toEqual('');
        });
    });

    it(':2: ' + 'should login using redirect flow, navigate to app backend and check if token is served from the cache', function () {
        if (testsId && testsId.includes(2) == false) {
            console.log("test 2 skipped");
            return;
        }
        var loginButton = element(by.id('loginButton'));
        browser.wait(EC.visibilityOf(loginButton), 5000, 'Login button is not displayed on the dom').then(function () {
            return loginButton.click();
        }).then(function () {
            return browser.wait(signInPage(), 5000, 'Error navigating to Signin Page');
        }).then(function () {
            return checkLoginState(settings.assignedUser, settings.password);
        }).then(function () {
            return browser.wait(homePage(), 5000, 'Error navigating to home page after sign-in');
        }).then(function () {
            validateLogin();
            var todoButton = element(by.xpath("//a[@href='/#TodoList']"));
            log("Sending request to app's backend");
            return todoButton.click();
        }).then(function () {
            return browser.wait(urlChanged(settings.appUrl), 1000, 'Navigation from root page to TodoList failed');
        }).then(function () {
            expect(browser.getCurrentUrl()).toMatch(settings.appUrl + '#TodoList');
            var todoData = element(by.css('tbody tr'));
            return browser.wait(EC.visibilityOf(todoData), 6000, 'Error in getting TodoList data (app backend)');
        }).then(function () {
            log("Received data from app's backend");
            var rows = element.all(by.css("tbody tr"));
            return rows.map(function (row) {
                var cells = row.all(by.tagName('td'));
                return {
                    cell1: cells.get(0).getText(),
                    cell2: cells.get(1).getText(),
                }
            });
        }).then(function (data) {
            log("Validating data from app's backend");
            if (data[0].cell2 === 'Edit | Delete ' && data[1].cell2 === 'Edit | Delete ')// Edge has an extra space for cell2
                expect(data).toEqual([{ cell1: 'TodoItem1', cell2: 'Edit | Delete ' }, { cell1: 'TodoItem2', cell2: 'Edit | Delete ' }]);
            else
                expect(data).toEqual([{ cell1: 'TodoItem1', cell2: 'Edit | Delete' }, { cell1: 'TodoItem2', cell2: 'Edit | Delete' }]);
            return logout();
        }).then(function () {
            expect(getValueLocalStorage(Storage.IDTOKEN)).toEqual('');
        });
    });

    it(':3: ' + 'should login using redirect flow, make call to an external API and check if request to AAD is sent using iframe and received access token is attached to the request', function () {
        if (testsId && testsId.includes(3) == false) {
            console.log("test 3 skipped");
            return;
        }
        var loginButton = element(by.id('loginButton'));
        browser.wait(EC.visibilityOf(loginButton), 5000, 'Login button is not displayed on the dom').then(function () {
            return loginButton.click();
        }).then(function () {
            return browser.wait(signInPage(), 5000, 'Error navigating to Signin Page');
        }).then(function () {
            return checkLoginState(settings.assignedUser, settings.password);
        }).then(function () {
            return browser.wait(homePage(), 5000, 'Error navigating to home page after sign-in');
        }).then(function () {
            validateLogin();
            log("Sending request to external api");
            var togoButton = element(by.xpath("//a[@href='/#TogoList']"));
            return togoButton.click();
        }).then(function () {
            return browser.wait(urlChanged(settings.appUrl), 1000, 'Navigation from root page to TogoList failed');
        }).then(function () {
            expect(browser.getCurrentUrl()).toMatch(settings.appUrl + '#TogoList');
            return browser.wait(localStorageChanged(Storage.ACCESS_TOKEN_KEY + settings.AppIdExternalApi, null, 'Error in getting token for external api when user is logged in'), 6000);
        }).then(function () {
            log("Checking if iframe is created to acquire the token for external api");
            return browser.findElements(by.tagName("iframe"));
        }).then(function (elements) {
            expect(elements.length).toEqual(1);
            expect(elements[0].getAttribute('id')).toEqual('adalRenewFrame' + settings.AppIdExternalApi);
            var togoData = element(by.css('tbody tr'));
            return browser.wait(EC.visibilityOf(togoData), 10000, 'Error occurred in getting data from external api');
        }).then(function () {
            log("Received data from external api");
            var rows = element.all(by.css("tbody tr"));
            return rows.map(function (row) {
                var cells = row.all(by.tagName('td'));
                return {
                    cell1: cells.get(0).getText(),
                    cell2: cells.get(1).getText(),
                }
            });
        }).then(function (data) {
            log("Validating data from external api");
            if (data[0].cell2 === 'Edit | Delete ' && data[1].cell2 === 'Edit | Delete ')// Edge has an extra space for cell2
                expect(data).toEqual([{ cell1: 'TogoItem1', cell2: 'Edit | Delete ' }, { cell1: 'TogoItem2', cell2: 'Edit | Delete ' }]);
            else
                expect(data).toEqual([{ cell1: 'TogoItem1', cell2: 'Edit | Delete' }, { cell1: 'TogoItem2', cell2: 'Edit | Delete' }]);
            return logout();
        }).then(function () {
            expect(getValueLocalStorage(Storage.IDTOKEN)).toEqual('');
        });
    });

    it(':4: ' + 'should login using redirect flow, navigate to the User Page and check if upn and audience is retrieved from the token received from AAD', function () {
        if (testsId && testsId.includes(4) == false) {
            console.log("test 4 skipped");
            return;
        }
        var loginButton = element(by.id('loginButton'));
        browser.wait(EC.visibilityOf(loginButton), 5000, 'Login button is not displayed on the dom').then(function () {
            return loginButton.click();
        }).then(function () {
            return browser.wait(signInPage(), 5000, 'Error navigating to Signin Page');
        }).then(function () {
            return checkLoginState(settings.assignedUser, settings.password);
        }).then(function () {
            return browser.wait(homePage(), 5000, 'Error navigating to home page after sign-in');
        }).then(function () {
            validateLogin();
            log("Sending request for user data endpoint to get upn and audience");
            var userDataButton = element(by.xpath("//a[@href='/#UserData']"));
            return userDataButton.click();
        }).then(function () {
            return browser.wait(urlChanged(settings.appUrl), 1000, 'Navigation from root page to UserData failed');
        }).then(function () {
            expect(browser.getCurrentUrl()).toMatch(settings.appUrl + '#UserData');
            var userData = element(by.css('.table.table-striped tr'));
            return browser.wait(EC.visibilityOf(userData), 6000, 'Error received in getting user data for logged in user');
        }).then(function () {
            var rows = element.all(by.css("tbody tr"));
            log("Received upn and audience info for signed in user");
            return rows.filter(function (row) {
                var cells = row.all(by.tagName('td'));
                return cells.get(0).getText().then(function (text) {
                    return text === 'aud' || text == 'upn';
                });
            });
        }).then(function (filteredRows) {
            log("Validating upn and audience info for signed in user");
            expect(filteredRows.length).toEqual(2);
            expect(filteredRows[0].$$('td').get(0).getText()).toEqual('aud');
            expect(filteredRows[0].$$('td').get(1).getText()).toEqual(settings.clientID);
            expect(filteredRows[1].$$('td').get(0).getText()).toEqual('upn');
            expect(filteredRows[1].$$('td').get(1).getText()).toEqual(settings.assignedUser);
            return logout();
        }).then(function () {
            expect(getValueLocalStorage(Storage.IDTOKEN)).toEqual('');
        });
    });

    it(':5: ' + 'should login using redirect flow, delete access token from cache for app backend, navigate to app backend and check if token is renewed using iframe', function () {
        if (testsId && testsId.includes(5) == false) {
            console.log("test 5 skipped");
            return;
        }
        var loginButton = element(by.id('loginButton'));
        browser.wait(EC.visibilityOf(loginButton), 5000, 'Login button is not displayed on the dom').then(function () {
            return loginButton.click();
        }).then(function () {
            return browser.wait(signInPage(), 5000, 'Error navigating to Signin Page');
        }).then(function () {
            return checkLoginState(settings.assignedUser, settings.password);
        }).then(function () {
            return browser.wait(homePage(), 5000, 'Error navigating to home page after sign-in');
        }).then(function () {
            validateLogin();
            log("Deleting access token from cache for app's backend");
            return removeItemLocalStorage(Storage.ACCESS_TOKEN_KEY + settings.clientID);
        }).then(function () {
            log("Sending api request for app's backend");
            var todoButton = element(by.xpath("//a[@href='/#TodoList']"));
            return todoButton.click();
        }).then(function () {
            return browser.wait(urlChanged(settings.appUrl), 1000, 'Navigation from root page to TodoList failed');
        }).then(function () {
            log("Checking if token is renewed using hidden iframe");
            expect(browser.getCurrentUrl()).toMatch(settings.appUrl + '#TodoList');
            return browser.wait(localStorageChanged(Storage.ACCESS_TOKEN_KEY + settings.clientID, null, 'Error in renewal of token for app backend when it is deleted from cache'), 6000);
        }).then(function () {
            return browser.findElements(by.tagName("iframe"));
        }).then(function (elements) {
            expect(elements.length).toEqual(1);
            expect(elements[0].getAttribute('id')).toEqual('adalIdTokenFrame');
            log("irame is created to renew the token");
            var todoData = element(by.css('tbody tr'));
            return browser.wait(EC.visibilityOf(todoData), 6000, 'Error in getting TodoList data (app backend)');
        }).then(function () {
            var rows = element.all(by.css("tbody tr"));
            log("Received data from app's backend");
            return rows.map(function (row) {
                var cells = row.all(by.tagName('td'));
                return {
                    cell1: cells.get(0).getText(),
                    cell2: cells.get(1).getText(),
                }
            });
        }).then(function (data) {
            log("Validating data received from app's backend");
            if (data[0].cell2 === 'Edit | Delete ' && data[1].cell2 === 'Edit | Delete ')// Edge browser has an extra space for cell2
                expect(data).toEqual([{ cell1: 'TodoItem1', cell2: 'Edit | Delete ' }, { cell1: 'TodoItem2', cell2: 'Edit | Delete ' }]);
            else
                expect(data).toEqual([{ cell1: 'TodoItem1', cell2: 'Edit | Delete' }, { cell1: 'TodoItem2', cell2: 'Edit | Delete' }]);
            return logout();
        }).then(function () {
            expect(getValueLocalStorage(Storage.IDTOKEN)).toEqual('');
        });
    });

    it(':6: ' + 'should login using redirect flow, set expiration key for app backend to 0, navigate to app backend and check if token is renewed using iframe', function () {
        if (testsId && testsId.includes(6) == false) {
            console.log("test 6 skipped");
            return;
        }
        var loginButton = element(by.id('loginButton'));
        browser.wait(EC.visibilityOf(loginButton), 5000, 'Login button is not displayed on the dom').then(function () {
            return loginButton.click();
        }).then(function () {
            return browser.wait(signInPage(), 5000, 'Error navigating to Signin Page');
        }).then(function () {
            return checkLoginState(settings.assignedUser, settings.password);
        }).then(function () {
            return browser.wait(homePage(), 5000, 'Error navigating to home page after sign-in');
        }).then(function () {
            validateLogin();
            log("Setting expiration time for token for app's backend to 0");
            return setValueLocalStorage(Storage.EXPIRATION_KEY + settings.clientID, '0');
        }).then(function () {
            var todoButton = element(by.xpath("//a[@href='/#TodoList']"));
            log("Sending api request to app's backend");
            return todoButton.click();
        }).then(function () {
            return browser.wait(urlChanged(settings.appUrl), 1000, 'Navigation from root page to TodoList failed');
        }).then(function () {
            expect(browser.getCurrentUrl()).toMatch(settings.appUrl + '#TodoList');
            return browser.wait(localStorageChanged(Storage.EXPIRATION_KEY + settings.clientID, '0', 'Error in renewing token for app backend when its expiration key is set to 0'), 6000);
        }).then(function () {
            log("Token is renewed using hidden iframe");
            return browser.findElements(by.tagName("iframe"));
        }).then(function (elements) {
            expect(elements.length).toEqual(1);
            expect(elements[0].getAttribute('id')).toEqual('adalIdTokenFrame');
            var todoData = element(by.css('tbody tr'));
            return browser.wait(EC.visibilityOf(todoData), 6000, 'Error in getting TodoList data (app backend)');
        }).then(function () {
            log("Received data from app's backend");
            var rows = element.all(by.css("tbody tr"));
            return rows.map(function (row) {
                var cells = row.all(by.tagName('td'));
                return {
                    cell1: cells.get(0).getText(),
                    cell2: cells.get(1).getText(),
                }
            });
        }).then(function (data) {
            log("Validating data received from app's backend");
            if (data[0].cell2 === 'Edit | Delete ' && data[1].cell2 === 'Edit | Delete ')// Edge browser has an extra space for cell2
                expect(data).toEqual([{ cell1: 'TodoItem1', cell2: 'Edit | Delete ' }, { cell1: 'TodoItem2', cell2: 'Edit | Delete ' }]);
            else
                expect(data).toEqual([{ cell1: 'TodoItem1', cell2: 'Edit | Delete' }, { cell1: 'TodoItem2', cell2: 'Edit | Delete' }]);
            return logout();
        }).then(function () {
            expect(getValueLocalStorage(Storage.IDTOKEN)).toEqual('');
        });
    });

    it(':7: ' + 'should login using redirect flow, make call to app backend with invalid redirectUri and check if AAD returns error in the html response instead of the url hash', function () {
        if (testsId && testsId.includes(7) == false) {
            console.log("test 7 skipped");
            return;
        }
        var loginButton = element(by.id('loginButton'));
        var invalidRedirectUri = 'https://invalidredirectUri';
        var errorElement = element(by.id('service_exception_message'));
        log("Setting redirectUri to an invalid value");
        browser.wait(EC.visibilityOf(loginButton), 5000, 'Login button is not displayed on the dom').then(function () {
            return loginButton.click();
        }).then(function () {
            return browser.wait(signInPage(), 5000, 'Error navigating to Signin Page');
        }).then(function () {
            return checkLoginState(settings.assignedUser, settings.password);
        }).then(function () {
            return browser.wait(homePage(), 5000, 'Error navigating to home page after sign-in');
        }).then(function () {
            validateLogin();
            return removeItemLocalStorage(Storage.ACCESS_TOKEN_KEY + settings.clientID);
        }).then(function () {
            setValueLocalStorage('redirectUri', invalidRedirectUri);
            var configButton = element(by.id("configButton"));
            return configButton.click();
        }).then(function () {
            log("Sending request to app's backend");
            var todoButton = element(by.xpath("//a[@href='/#TodoList']"));
            return todoButton.click();
        }).then(function () {
            return browser.wait(urlChanged(settings.appUrl), 1000, 'Navigation from root page to TodoList failed');
        }).then(function () {
            expect(browser.getCurrentUrl()).toMatch(settings.appUrl + '#TodoList');
            return browser.findElements(by.tagName("iframe"));
        }).then(function (elements) {
            log("Sending request to acquire token for app's backend");
            expect(elements.length).toEqual(1);
            expect(elements[0].getAttribute('id')).toEqual('adalIdTokenFrame');
            return browser.switchTo().frame('adalIdTokenFrame');
        }).then(function () {
            return browser.wait(function () {
                return browser.isElementPresent(errorElement);
            }, 6000, 'iframe is not created when token request is sent using an invalid redirect uri');
        }).then(function () {
            return errorElement.getAttribute("innerHTML");
        }).then(function (html) {
            log("Received error response from AAD in the the form of html instead of a url fragment");
            expect(html.indexOf('AADSTS50011')).not.toEqual(-1);
            return browser.switchTo().defaultContent();
        }).then(function () {
            browser.sleep(6000);
            return logout();
        }).then(function () {
            expect(getValueLocalStorage(Storage.IDTOKEN)).toEqual('');
        });
    });

    //it('should logout and login using redirect flow for unassigned user and check if AAD returns an error', function () {
    //    var loginButton = element(by.id('loginButton'));
    //    browser.wait(EC.visibilityOf(loginButton), 5000, 'Login button is not displayed on the dom').then(function () {
    //        return loginButton.click();
    //    }).then(function () {
    //        return checkLoginState(settings.unassignedUser, settings.password);
    //    }).then(function () {
    //        expect(element(by.id('logoutButton')).isDisplayed()).not.toBeTruthy();
    //        expect(element(by.id('loginButton')).isDisplayed()).toBeTruthy();
    //        expect(getValueLocalStorage(Storage.IDTOKEN)).toEqual(null);
    //        expect(getValueLocalStorage(Storage.ERROR)).toEqual("access_denied");
    //        return getValueLocalStorage(Storage.ERROR_DESCRIPTION);
    //    }).then(function (errorDescription) {
    //        expect(errorDescription.indexOf("AADSTS50105")).not.toEqual(-1);
    //        return getValueLocalStorage(Storage.LOGIN_ERROR);
    //    }).then(function (loginError) {
    //        expect(loginError.indexOf("AADSTS50105")).not.toEqual(-1);
    //        browser.sleep(6000);
    //    });
    //});

    it(':8: ' + 'should navigate to Home page, enter text in a textbox, log in using redirect flow and check if textbox text gets cleared as app gets reloaded', function () {
        if (testsId && testsId.includes(8) == false) {
            console.log("test 8 skipped");
            return;
        }
        log("Check if app gets reloaded in case of login using redirect flow");
        var loginButton = element(by.id('loginButton'));
        var homeButton = element(by.xpath("//a[@href='/#Home']"));
        var homePageTextBox = element(by.id("homePageTextBox"));
        browser.wait(EC.visibilityOf(homeButton), 5000).then(function () {
            return homeButton.click();
        }).then(function () {
            return browser.wait(urlChanged(settings.appUrl), 1000, 'Navigation from root page to Home page failed');
        }).then(function () {
            return browser.wait(EC.visibilityOf(homePageTextBox), 5000, 'Text box on home page is not visible');
        }).then(function () {
            log("Entering text in a text box on the home page")
            homePageTextBox.sendKeys("Initial State");
            expect(homePageTextBox.getAttribute('value')).toEqual("Initial State");
            return browser.wait(EC.visibilityOf(loginButton), 5000, 'Login button is not displayed on the dom');
        }).then(function () {
            return loginButton.click();
        }).then(function () {
            return browser.wait(signInPage(), 5000, 'Error navigating to Signin Page');
        }).then(function () {
            return checkLoginState(settings.assignedUser, settings.password);
        }).then(function () {
            log("Navaigated back to the home page after login");
            return browser.wait(homePage(), 5000, 'Error navigating to home page after sign-in');
        }).then(function () {
            validateLogin();
            expect(homePageTextBox.getAttribute('value')).toEqual("");
            log("App gets reloaded and text entered in the text box is not retained");
            return logout();
        }).then(function () {
            expect(getValueLocalStorage(Storage.IDTOKEN)).toEqual('');
        });
    });


    it(':9: ' + 'should set the redirectUri to a valid custom path other than the app root page and check that iframe loads this custom path when receives a 302 from AAD instead of loading the app.', function () {
        if (testsId && testsId.includes(9) == false) {
            console.log("test 9 skipped");
            return;
        }
        var loginButton = element(by.id('loginButton'));
        browser.wait(homePage(), 5000).then(function () {
            return browser.wait(EC.visibilityOf(loginButton), 5000, 'Login button is not displayed on the dom')
        }).then(function () {
            return loginButton.click();
        }).then(function () {
            return browser.wait(signInPage(), 5000, 'Error navigating to Signin Page');
        }).then(function () {
            return checkLoginState(settings.assignedUser, settings.password);
        }).then(function () {
            return browser.wait(homePage(), 5000, 'Error navigating to home page after sign-in');
        }).then(function () {
            validateLogin();
            log("Deleting access token from cache for app's backend");
            return removeItemLocalStorage(Storage.ACCESS_TOKEN_KEY + settings.clientID);
        }).then(function () {
            log("Setting redirectUri to a custom html page to prevent reloading of the app after login in case of redirect flow");
            setValueLocalStorage('redirectUri', settings.appUrl + 'frameRedirect.html');
            var configButton = element(by.id("configButton"));
            return configButton.click();
        }).then(function () {
            log("Sending app request for app's backend");
            var todoButton = element(by.xpath("//a[@href='/#TodoList']"));
            return todoButton.click();
        }).then(function () {
            return browser.wait(urlChanged(settings.appUrl), 1000, 'Navigation from root page to TodoList page failed');
        }).then(function () {
            log("Token is renewed for app's backend using hidden iframe");
            expect(browser.getCurrentUrl()).toMatch(settings.appUrl + '#TodoList');
            return browser.wait(localStorageChanged(Storage.ACCESS_TOKEN_KEY + settings.clientID, null, 'Error in getting token for app backen when redirect uri is set to a custom path'), 6000);
        }).then(function () {
            return browser.findElements(by.tagName("iframe"));
        }).then(function (elements) {
            expect(elements.length).toEqual(1);
            expect(elements[0].getAttribute('id')).toEqual('adalIdTokenFrame');
            log("iframe is loaded with the custom html page with the token attached as the url fragment");
            var todoData = element(by.css('tbody tr'));
            return browser.wait(EC.visibilityOf(todoData), 6000, 'Error in getting TodoList data (app backend)');
        }).then(function () {
            log("Received data from app's backend");
            var rows = element.all(by.css("tbody tr"));
            return rows.map(function (row) {
                var cells = row.all(by.tagName('td'));
                return {
                    cell1: cells.get(0).getText(),
                    cell2: cells.get(1).getText(),
                }
            });
        }).then(function (data) {
            log("Validating data received from app's backend");
            if (data[0].cell2 === 'Edit | Delete ' && data[1].cell2 === 'Edit | Delete ')// Edge browser has an extra space for cell2
                expect(data).toEqual([{ cell1: 'TodoItem1', cell2: 'Edit | Delete ' }, { cell1: 'TodoItem2', cell2: 'Edit | Delete ' }]);
            else
                expect(data).toEqual([{ cell1: 'TodoItem1', cell2: 'Edit | Delete' }, { cell1: 'TodoItem2', cell2: 'Edit | Delete' }]);
            return browser.switchTo().frame('adalIdTokenFrame');
        }).then(function () {
            expect(element(by.id('frameRedirect')).isPresent()).toBe(true);
            expect(element(by.id('frameRedirect')).getAttribute("innerHTML")).toEqual("frameRedirect.html");
        }).then(function () {
            return browser.switchTo().defaultContent();
        }).then(function () {
            return logout();
        }).then(function () {
            expect(getValueLocalStorage(Storage.IDTOKEN)).toEqual('');
        });
    });

    it(':10: ' + 'should login and logout using popUp', function () {
        if (testsId && testsId.includes(10) == false) {
            console.log("test 10 skipped");
            return;
        }
        setValueLocalStorage('popUp', 'true');
        log("Setting popUp to true to enable login using a popUp window instead of a redirect");
        var configButton = element(by.id("configButton"));
        var loginButton = element(by.id('loginButton'));
        var mainWindow = null, popUpWindow = null;
        browser.wait(EC.visibilityOf(configButton), 5000).then(function () {
            return configButton.click();
        }).then(function () {
            return browser.wait(EC.visibilityOf(loginButton), 5000, 'Login button is not displayed on the dom');
        }).then(function () {
            return loginButton.click();
        }).then(function () {
            return browser.getAllWindowHandles();
        }).then(function (handles) {
            expect(handles.length).toEqual(2);
            mainWindow = handles[0];
            popUpWindow = handles[1];
            return browser.switchTo().window(popUpWindow);
        }).then(function () {
            return checkLoginState(settings.assignedUser, settings.password);
        }).then(function () {
            return browser.switchTo().window(mainWindow);
        }).then(function () {
            browser.sleep(1000);
            validateLogin();
            log("Popup window is closed after successful login")
            return logout();
        }).then(function () {
            expect(getValueLocalStorage(Storage.IDTOKEN)).toEqual('');
        });
    });

    it(':11: ' + 'should navigate to Home page, enter text in a textbox, log in using popUp and check if textbox text is retained as app does not get reloaded', function () {
        if (testsId && testsId.includes(11) == false) {
            console.log("test 11 skipped");
            return;
        }
        log("Setting popUp to true to enable login using a popUp window instead of a redirect");
        log("Check if app is not reloaded when login is performed using a popUp window");
        setValueLocalStorage('popUp', 'true');
        var configButton = element(by.id("configButton"));
        var loginButton = element(by.id('loginButton'));
        var homeButton = element(by.xpath("//a[@href='/#Home']"));
        var homePageTextBox = element(by.id("homePageTextBox"));
        var mainWindow = null, popUpWindow = null;
        browser.wait(EC.visibilityOf(configButton), 5000).then(function () {
            return configButton.click();
        }).then(function () {
            return homeButton.click();
        }).then(function () {
            return browser.wait(urlChanged(settings.appUrl), 1000);
        }).then(function () {
            return browser.wait(EC.visibilityOf(homePageTextBox), 5000);
        }).then(function () {
            log("Entering text in a textbox on the home page");
            homePageTextBox.sendKeys("Initial State");
            expect(homePageTextBox.getAttribute('value')).toEqual("Initial State");
        }).then(function () {
            return browser.wait(EC.visibilityOf(loginButton), 5000, 'Login button is not displayed on the dom');
        }).then(function () {
            return loginButton.click();
        }).then(function () {
            return browser.getAllWindowHandles();
        }).then(function (handles) {
            expect(handles.length).toEqual(2);
            mainWindow = handles[0];
            popUpWindow = handles[1];
            return browser.switchTo().window(popUpWindow);
        }).then(function () {
            return checkLoginState(settings.assignedUser, settings.password);
        }).then(function () {
            return browser.switchTo().window(mainWindow);
        }).then(function () {
            browser.sleep(1000);
            validateLogin();
            expect(homePageTextBox.getAttribute('value')).toEqual("Initial State");
            log("App is not reloaded in case of login using a popUp window");
            return logout();
        }).then(function () {
            expect(getValueLocalStorage(Storage.IDTOKEN)).toEqual('');
        });
    });

    it(':12: ' + 'should navigate to a protected route using redirect flow and check if user gets redirected to the login page. After successful authentication, user should get redirected back to the protected route', function () {
        if (testsId && testsId.includes(12) == false) {
            console.log("test 12 skipped");
            return;
        }
        var todoButton = element(by.xpath("//a[@href='/#TodoList']"));
        browser.wait(EC.visibilityOf(todoButton), 5000, 'Todo button is not displayed on the dom').then(function () {
            log("Navigating to a protected route without a signed-in user");
            return todoButton.click();
        }).then(function () {
            return browser.wait(urlChanged(settings.appUrl), 1000);
        }).then(function () {
            return browser.getCurrentUrl();
        }).then(function (url) {
            expect(url.indexOf('https://login.microsoftonline.com')).not.toEqual(-1);
            log("User gets redirected to the sign-in page");
            return checkLoginState(settings.assignedUser, settings.password);
        }).then(function () {
            validateLogin();
            log("login start page is saved with the url of the protected route");
            expect(getValueLocalStorage(Storage.LOGIN_REQUEST)).toEqual(settings.appUrl + '#TodoList');
            var todoData = element(by.css('tbody tr'));
            log("Window location is set to the protected route after log in (initiate request to app's backend)");
            return browser.wait(EC.visibilityOf(todoData), 6000, 'Error in getting TodoList data (app backend)');
        }).then(function () {
            var rows = element.all(by.css("tbody tr"));
            return rows.map(function (row) {
                var cells = row.all(by.tagName('td'));
                return {
                    cell1: cells.get(0).getText(),
                    cell2: cells.get(1).getText(),
                }
            });
        }).then(function (data) {
            log("Received data for app's backend");
            if (data[0].cell2 === 'Edit | Delete ' && data[1].cell2 === 'Edit | Delete ')// Edge has an extra space for cell2
                expect(data).toEqual([{ cell1: 'TodoItem1', cell2: 'Edit | Delete ' }, { cell1: 'TodoItem2', cell2: 'Edit | Delete ' }]);
            else
                expect(data).toEqual([{ cell1: 'TodoItem1', cell2: 'Edit | Delete' }, { cell1: 'TodoItem2', cell2: 'Edit | Delete' }]);
            return logout();
        }).then(function () {
            expect(getValueLocalStorage(Storage.IDTOKEN)).toEqual('');
        });
    });
});
