Running tests: protractor protractor.conf.chrome.js
stdout: [16:40:26] I/launcher - Running 1 instances of WebDriver
[16:40:26] I/hosted - Using the selenium server at https://hub-cloud.browserstack.com/wd/hub
Getting secret value for for secrethttps://ADALTestInfo.vault.azure.net/secrets/MSIDLAB5-manNonMFA1
Started
login method called
home page loaded
validating if login was successful
home page loaded
logout method called
home page loaded
[32m.[0mlogin method called
home page loaded
validating if login was successful
home page loaded
Sending request to app's backend
[16:41:01] W/element - more than one element found for locator By(css selector, tbody tr) - the first result will be used
Received data from app's backend
Validating data from app's backend
logout method called
home page loaded
[32m.[0mlogin method called
home page loaded
validating if login was successful
home page loaded
Sending request to external api
Checking if iframe is created to acquire the token for external api
[16:41:32] W/element - more than one element found for locator By(css selector, tbody tr) - the first result will be used
Received data from external api
Validating data from external api
logout method called
home page loaded
[32m.[0mlogin method called
home page loaded
validating if login was successful
home page loaded
Sending request for user data endpoint to get upn and audience
[16:41:48] W/element - more than one element found for locator By(css selector, .table.table-striped tr) - the first result will be used
Received upn and audience info for signed in user
Validating upn and audience info for signed in user
logout method called
home page loaded
[32m.[0mlogin method called
home page loaded
validating if login was successful
home page loaded
Deleting access token from cache for app's backend
Sending api request for app's backend
Checking if token is renewed using hidden iframe
irame is created to renew the token
[16:42:11] W/element - more than one element found for locator By(css selector, tbody tr) - the first result will be used
Received data from app's backend
Validating data received from app's backend
logout method called
home page loaded
[32m.[0mlogin method called
home page loaded
validating if login was successful
home page loaded
Setting expiration time for token for app's backend to 0
Sending api request to app's backend
Token is renewed using hidden iframe
[16:42:28] W/element - more than one element found for locator By(css selector, tbody tr) - the first result will be used
Received data from app's backend
Validating data received from app's backend
logout method called
home page loaded
[32m.[0mSetting redirectUri to an invalid value
login method called
home page loaded
validating if login was successful
home page loaded
Sending request to app's backend
Sending request to acquire token for app's backend
Received error response from AAD in the the form of html instead of a url fragment
logout method called
home page loaded
[32m.[0mCheck if app gets reloaded in case of login using redirect flow
[16:43:00] W/element - more than one element found for locator By(xpath, //a[@href='/#Home']) - the first result will be used
[16:43:00] W/element - more than one element found for locator By(xpath, //a[@href='/#Home']) - the first result will be used
Entering text in a text box on the home page
login method called
Navaigated back to the home page after login
home page loaded
validating if login was successful
home page loaded
App gets reloaded and text entered in the text box is not retained
logout method called
home page loaded
[32m.[0mhome page loaded
login method called
home page loaded
validating if login was successful
home page loaded
Deleting access token from cache for app's backend
Setting redirectUri to a custom html page to prevent reloading of the app after login in case of redirect flow
Sending app request for app's backend
Token is renewed for app's backend using hidden iframe
iframe is loaded with the custom html page with the token attached as the url fragment
[16:43:25] W/element - more than one element found for locator By(css selector, tbody tr) - the first result will be used
Received data from app's backend
Validating data received from app's backend
logout method called
home page loaded
[32m.[0mSetting popUp to true to enable login using a popUp window instead of a redirect
login method called
validating if login was successful
home page loaded
Popup window is closed after successful login
logout method called
home page loaded
[32m.[0mSetting popUp to true to enable login using a popUp window instead of a redirect
Check if app is not reloaded when login is performed using a popUp window
[16:43:46] W/element - more than one element found for locator By(xpath, //a[@href='/#Home']) - the first result will be used
Entering text in a textbox on the home page
login method called
validating if login was successful
home page loaded
App is not reloaded in case of login using a popUp window
logout method called
home page loaded
[32m.[0mNavigating to a protected route without a signed-in user
User gets redirected to the sign-in page
login method called
validating if login was successful
home page loaded
login start page is saved with the url of the protected route
Window location is set to the protected route after log in (initiate request to app's backend)
[16:44:09] W/element - more than one element found for locator By(css selector, tbody tr) - the first result will be used
Received data for app's backend
logout method called
home page loaded
[32m.[0m


12 specs, 0 failures
Finished in 223.829 seconds

[16:44:20] I/launcher - 0 instance(s) of WebDriver still running
[16:44:20] I/launcher - chrome #01 passed

