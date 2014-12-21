Simple ADAL.JS Sample
=====================

This simple example is intended to show how to use the adal.js methods to authenticate with Office 365 and obtain a token that can be used in REST calls to the Office 365 API.
The sample uses a simple HTML page and about 50 lines of JavaScript and only depends on adal.js and jQuery.

## Running the sample

Modify the configuration settings in app.js and ensure that you have your app settings in Azure AD .

Open a new website in Visual Studio (File->New->Web site...) selecting the directory containing these files. Visual Studio will allocate a 
port number which is visible if you inspect the project properties. This address and port will need to be included in the list of redirect URLs 
in your Azure AD app settings.

Clicking on the login button should take you to the login page. After you have logged in you should see your user id and name in the page.
 