'use strict';
(function () {
  // Simple JavaScript to demonstrate how to use ADAL.JS
  var config =
          {
            tenant: 'contoso.onmicrosoft.com', // replace with your tenant id (e.g. contoso.onmicrosoft.com)
            clientId: '79f10513-ca82-4e6a-8cc9-f10513ff6928', // replace with your clientID (GUID)
            extraQueryParameter: 'nux=1',
            url: window.location.href // use current page URL
          };

  var authContext = new AuthenticationContext(config);

  if (authContext.isCallback(window.location.hash)) {
    // callback from Azure AD auth page
    var requestInfo = authContext.getRequestInfo(window.location.hash);
    authContext.saveTokenFromHash(requestInfo);
    window.location.hash = '';
  }

  // bind to button events
  jQuery("#login").click(function () {
    authContext.login();
  });
  jQuery("#logout").click(function () {
    authContext.logOut();
  });

  var resource = authContext.getResourceForEndpoint(config.url);
  var token = authContext.getCachedToken(resource); // auth token to be used against Office365 API
  var isAuthenticated = token !== null && token.length > 0;
  var loginError = authContext.getLoginError() || '';

  var user = authContext.getCachedUser();
  if (isAuthenticated && user !== null) {
    jQuery("#userid").text(user.userName);
    var name = "";
    if (user.profile != null) name = user.profile.given_name + " " + user.profile.family_name;
    jQuery("#username").text(name);
    // TODO: demonstrate Office365 API REST call using bearer token
    //       (requires iframe to work in browser because of cross-site request)
  }
  else {
    jQuery("#userid").text('user is not logged in');
    jQuery("#username").text('');
  }
  jQuery("#error").text(loginError);
}());