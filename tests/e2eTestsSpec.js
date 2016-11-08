'use strict'
/* Directive tells jshint that it, describe are globals defined by jasmine */
/* global it */
/* global describe */

describe('E2ETests', function () {
    var appRootUrl, appToGoListUrl, appHomeUrl, appTodoListUrl, username, password, appSetupUrl, unassignedUsername, unassignedPassword;
    beforeEach(function () {
        appRootUrl = 'http://localhost:44332/'; //'https://adaljstestapp.azurewebsites.net/'; //'https://adaljsnonangularapp.azurewebsites.net/'; //'http://localhost:44332/';
        appSetupUrl = appRootUrl + 'setup.html';
        appHomeUrl = appRootUrl + '#/Home';
        appToGoListUrl = appRootUrl + '#/ToGoList';
        appTodoListUrl = appRootUrl + '#/TodoList'
        username = "victor@tushartest.onmicrosoft.com";
        password = "user@1992";
        unassignedUsername = "pandu@tushartest2.onmicrosoft.com";
        unassignedPassword = "user@1992";

        browser.ignoreSynchronization = true
        browser.get(appSetupUrl);
        element(by.id('uirouter-nopopup-nohtml5-otherwise')).click();
    });

    afterEach(function () {

    });

    it('tests login button ', function () {
        browser.ignoreSynchronization = true;
        element(by.id('loginButton')).click().then(function () {
            element(by.id('cred_userid_inputtext')).sendKeys(username);
            element(by.id('cred_password_inputtext')).sendKeys(password);
            browser.sleep(3000);
            element(by.id('cred_sign_in_button')).click().then(function () {
                browser.getCurrentUrl().then(function (url) {
                    expect(url).toContain(appHomeUrl);
                    expect(browser.executeScript(function() {
                        return window.sessionStorage.getItem('adal.idtoken');
                    })).not.toBe(null);
                });
            });
        });
        if (element(by.id('logoutButton')).isDisplayed()) {
            element(by.id('logoutButton')).click().then(function () {
                browser.sleep(3000);
                browser.getCurrentUrl().then(function (url) {
                    expect(url).toContain(appHomeUrl);
                })
            });
        }
    });

    it('tests that navigating to protected route triggers login', function () {
        browser.ignoreSynchronization = true;
        element(by.id('todoListOption')).click().then(function () {
            if (element(by.id('victor_tushartest_onmicrosoft_com_link'))) {
                element(by.id('victor_tushartest_onmicrosoft_com_link')).click().then(function () {
                    element(by.id('cred_password_inputtext')).sendKeys(password);
                    browser.sleep(3000);
                    element(by.id('cred_sign_in_button')).click().then(function () {
                        browser.getCurrentUrl().then(function (url) {
                            expect(url).toContain(appHomeUrl);
                            expect(browser.executeScript(function () {
                                return window.sessionStorage.getItem('adal.idtoken');
                            })).not.toBe(null);
                        });
                    });
                });
            }
        });
        if (element(by.id('logoutButton')).isDisplayed()) {
            element(by.id('logoutButton')).click().then(function () {
                browser.sleep(3000);
                browser.getCurrentUrl().then(function (url) {
                    expect(url).toContain(appHomeUrl);
                })
            });
        }
    });

    it('tests login with an unassigned user ', function () {
        browser.ignoreSynchronization = true;
        element(by.id('loginButton')).click().then(function () {
            if (element(by.id('use_another_account_link'))) {
                element(by.id('use_another_account_link')).click().then(function () {
                    element(by.id('cred_userid_inputtext')).sendKeys(unassignedUsername);
                    element(by.id('cred_password_inputtext')).sendKeys(unassignedPassword);
                    browser.sleep(3000);
                    element(by.id('cred_sign_in_button')).click().then(function () {
                        browser.getCurrentUrl().then(function (url) {
                            expect(url).toContain(appHomeUrl);
                            expect(element(by.id('logoutButton')).isDisplayed()).toBe(false);
                            browser.executeScript(function () {
                                return 
                                {
                                    'error': window.sessionStorage.getItem('adal.error'),
                                    'idtoken': window.sessionStorage.getItem('adal.idtoken')
                                };
                            }).then(function (storage) {
                                console.log(storage);
                                expect(storage.error).toBe('access_denied');
                                expect(storage.idtoken).toBe(null);
                            });
                        });
                    });
                });
            }
        });
    });
});