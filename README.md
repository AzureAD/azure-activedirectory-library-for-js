Active Directory Authentication Library (ADAL) for JavaScript
====================================
|[Getting Started](https://github.com/AzureAD/azure-activedirectory-library-for-js/wiki)| [Docs](https://aka.ms/aaddev)| [Samples](https://github.com/AzureAD/azure-activedirectory-library-for-js/wiki/Code-samples)| [Support](README.md#community-help-and-support)
| --- | --- | --- | --- |

Active Directory Authentication Library for JavaScript (ADAL JS) helps you to use Azure AD for handling authentication in your single page applications.
This library works with both plain JS as well as AngularJS applications.

[![Build Status](https://travis-ci.org/AzureAD/azure-activedirectory-library-for-js.svg?branch=dev)](https://travis-ci.org/AzureAD/azure-activedirectory-library-for-js)[![npm](https://img.shields.io/npm/v/adal-angular.svg)](https://www.npmjs.com/package/adal-angular)[![npm](https://img.shields.io/npm/dm/adal-angular.svg)](https://www.npmjs.com/package/adal-angular)


## Installation

You have multiple ways of getting ADAL JS:

Via NPM (https://www.npmjs.com/package/adal-angular):

    npm install adal-angular

*Note:* Currently there is one NPM package providing both the plain JS library (adal.js) and the AngularJS wrapper (adal-angular.js).

Via CDN:

    <!-- Latest compiled and minified JavaScript -->
    <script src="https://secure.aadcdn.microsoftonline-p.com/lib/1.0.18/js/adal.min.js"></script>
    <script src="https://secure.aadcdn.microsoftonline-p.com/lib/1.0.18/js/adal-angular.min.js"></script>

Via Bower:

    $ bower install adal-angular

## Usage

#### Prerequisite

Before using ADAL JS, follow the instructions to [register your application](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-integrating-applications) on the Azure portal. Also, make sure to enable the [OAuth 2.0 implicit flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v1-oauth2-implicit-grant-flow) by setting the property `oauth2AllowImplicitFlow` to true by editing your application manifest on the portal. Implicit flow is used by ADAL JS to get tokens.

#### 1. Instantiate the AuthenticationContext

Instantiate the global variable AuthenticationContext with a minimal required config of clientID. You can read about other configurable options [here](https://github.com/AzureAD/azure-activedirectory-library-for-js/wiki/Config-authentication-context#configurable-options).

```JavaScript
window.config = {
    clientId: '[Enter your client_id here, e.g. g075edef-0efa-453b-997b-de1337c29185]',
    popUp: true,
    callback : callbackFunction
};

var authContext = new AuthenticationContext(config);

function callbackFunction(errorDesc, token, error, tokenType)
{
}

```

#### 2. Login the user

Your app must login the user to establish user context. The login operates in popup mode if you set the option `popUp: true` instead of a full redirect as shown in the config above.Defaults to `false. The callback function passed in the Authentication request constructor will be called after the login with success or failure results.

```JavaScript
var user = authenticationContext.getCachedUser();
if (user) {
    // Use the logged in user information to call your own api
    onLogin(null, user);
}
else {
    // Initiate login
    authenticationContext.login();
}
```

#### 3. Get an access token

Next, you can get access tokens for the APIs your app needs to call using the acquireToken method which attempts to acquire token silently. The acquireToken method takes a callback function as shown below.

If the silent token acquisition fails for some reasons such as an expired session or password change, you will need to invoke one of the interactive methods to acquire tokens.

 ```JavaScript
 authenticationContext.acquireToken(webApiConfig.resourceId, function (errorDesc, token, error) {
     if (error) { //acquire token failure
         if (config.popUp) {
             // If using popup flows
             authenticationContext.acquireTokenPopup(webApiConfig.resourceId, null, null,  function (errorDesc, token, error) {});
         }
         else {
         // In this case the callback passed in the Authentication request constructor will be called.
             authenticationContext.acquireTokenRedirect(webApiConfig.resourceId, null, null);
         }
     }
     else {
         //acquired token successfully
     }
 });
}
```

**Note:** In ADAL JS, you will have to explicitly call the handleWindowCallback method on page load to handle the response from the server in case of redirect flows like login without popup and acquireTokenRedirect. There is no need to call this function for popup flows like loginPopup and acquireTokenPopup.  This method must be called for processing the response received from AAD. It extracts the hash, processes the token or error, saves it in the cache and calls the registered callback function in your initialization with the result.   

```JavaScript
if (authenticationContext.isCallback(window.location.hash)) {
    authenticationContext.handleWindowCallback();
}
```

#### 4. Use the token as a bearer in an HTTP request to call the Microsoft Graph or a Web API

```JavaScript
    var headers = new Headers();
    var bearer = "Bearer " + token;
    headers.append("Authorization", bearer);
    var options = {
         method: "GET",
         headers: headers
    };
    var graphEndpoint = "https://graph.microsoft.com/v1.0/me";

    fetch(graphEndpoint, options)
        .then(function (response) {
             //do something with response
        }
```

You can learn further details about ADAL.js functionality documented in the [ADAL Wiki](https://github.com/AzureAD/azure-activedirectory-library-for-js/wiki/) and find complete [code samples](https://github.com/AzureAD/azure-activedirectory-library-for-js/wiki/Code-samples).

## Versions

Current version - **1.0.18**  
Minimum recommended version - 1.0.11  
You can find the changes for each version in the [change log](https://github.com/AzureAD/azure-activedirectory-library-for-js/blob/master/changelog.txt).

## Contribution

We encourage and welcome contributions to the library. Please read the [contributing guide](./contributing.md) before starting.

## Samples and Documentation

Please refer these [code samples using ADAL.js](https://github.com/AzureAD/azure-activedirectory-library-for-js/wiki/Code-samples) based on your application scenario.

You can also find a [full suite of sample applications](https://github.com/azure-samples?query=active-directory) and [documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-developers-guide) to help you get started with learning the Azure Identity system. This includes tutorials for multiple platforms; and a detailed guide to registering your app with Azure Active Directory. We also provide full walkthroughs for authentication flows such as OAuth2, OpenID Connect, Graph API, and other awesome features.

## Community Help and Support

We leverage [Stack Overflow](http://stackoverflow.com/) to work with the community on supporting Azure Active Directory and its SDKs, including this one! We highly recommend you ask your questions on Stack Overflow (we're all on there!) Also browser existing issues to see if someone has had your question before.

We recommend you use the "adal" tag so we can see it! Here is the latest Q&A on Stack Overflow for ADAL: [http://stackoverflow.com/questions/tagged/adal](http://stackoverflow.com/questions/tagged/adal)

## Security Reporting

If you find a security issue with our libraries or services please report it to [secure@microsoft.com](mailto:secure@microsoft.com) with as much detail as possible. Your submission may be eligible for a bounty through the [Microsoft Bounty](http://aka.ms/bugbounty) program. Please do not post security issues to GitHub Issues or any other public site. We will contact you shortly upon receiving the information. We encourage you to get notifications of when security incidents occur by visiting [this page](https://technet.microsoft.com/en-us/security/dd252948) and subscribing to Security Advisory Alerts.

## License
Copyright (c) Microsoft Corporation.  All rights reserved. Licensed under the Apache License, Version 2.0 (the "License");

## We value and adhere to the Microsoft Open Source Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
