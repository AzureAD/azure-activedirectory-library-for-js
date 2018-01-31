[![npm version](https://badge.fury.io/js/adal-ts.svg)](https://badge.fury.io/js/adal-ts)
![npm license](https://img.shields.io/npm/l/express.svg)
[![Coverage Status](https://coveralls.io/repos/github/HNeukermans/adal-ts/badge.svg)](https://coveralls.io/github/HNeukermans/adal-ts)
[![Build Status](https://travis-ci.org/HNeukermans/adal-ts.svg?branch=master)](https://travis-ci.org/HNeukermans/adal-ts)
![live demo](https://img.shields.io/badge/demo-live-orange.svg)

# adal-ts
A typescript library that allows you to authenticate against Azure Active Directory

aka adal.js typescript rewrite

## technical features:
 1. 100% typescript
 2. 80% code coverage
 3. easy to install, no dependencies.


## Installation
```
npm install adal-ts --save
```

## Access & ID token support
v0.6.0 adds support for access tokens for use with implicit auth flow against AAD and Office365 [link](https://github.com/HNeukermans/adal-ts/pull/26)

## adal-ts does 4 things:
 1. login to Azure Active Directory
 2. get the logged in user
 3. logout to Azure Active Directory
 4. allow to retrieve the token from storage (ex: apply it to header)
 
## Example Usage

### login
```
let config = new AdalConfig('clientID', 'unittest.onmicrosoft.com', 'http://localhost');
let context = Authentication.getContext(config);
context.login();
...
//to process the redirect after login, place this inside your root component  (ex: NG2 AppComponent.ngOnInit)
Authentication.getAadRedirectProcessor().process();
```

### get the currently logged in user
```
let config = new AdalConfig('clientID', 'unittest.onmicrosoft.com', 'http://localhost');
let context = Authentication.getContext(config);
let user = context.getUser();

```

### logout
```
let config = new AdalConfig('clientID', 'unittest.onmicrosoft.com', 'http://localhost');
let context = Authentication.getContext(config);
context.logout();

```

### getToken
```
let config = new AdalConfig('clientID', 'unittest.onmicrosoft.com', 'http://localhost');
let context = Authentication.getContext(config);
let token = context.getToken();
```

## [Adal-ts live demo](http://adal-ts-demo.azurewebsites.net/#/)

login with:  
    user: guestone@hneu70532.onmicrosoft.com <br>
    pwd: Test1234

source: [adal-ts-consumer](https://github.com/HNeukermans/adal-ts-consumer)

## Issue Reporting

If you have found a bug or if you have a feature request, please report them at this repository issues section. 

## Contributing

Pull requests are welcome!

## Building

Use `webpack` to compile and build. A `/dist` folder is generated.

```
npm run webpack
```

## Code coverage

Use `npm test` cmd to compile and run all tests. After the tests have run a /coverage folder is generated. Drill down to index.html to see the results.
![code_coverage_report](https://cloud.githubusercontent.com/assets/2285199/20648817/5019e648-b4b1-11e6-8484-2887204ea783.png)

## Unit testing

Use `npm test` cmd to compile and run all tests. Test runner is configured with autowatching and 'progress' as test reporter. 

  
