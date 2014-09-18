using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using Microsoft.Owin.Security;
using Microsoft.Owin.Security.ActiveDirectory;
using Owin;

namespace OmerSample
{
    public partial class Startup
    {
        // For more information on configuring authentication, please visit http://go.microsoft.com/fwlink/?LinkId=301864
        public void ConfigureAuth(IAppBuilder app)
        {
            app.UseWindowsAzureActiveDirectoryBearerAuthentication(
                new WindowsAzureActiveDirectoryBearerAuthenticationOptions
                {
                    Audience = ConfigurationManager.AppSettings["ida:Audience"],
                    //Tenant = ConfigurationManager.AppSettings["ida:Tenant"],
                    MetadataAddress = "https://login.windows-ppe.net/52d4b072-9470-49fb-8721-bc3a1c9912a1/federationmetadata/2007-06/federationmetadata.xml"
                });
        }
    }
}
