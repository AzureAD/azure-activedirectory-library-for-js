/*
  * Copyright (c) Microsoft Corporation
  *  All Rights Reserved
  *  MIT License
  *
  * Permission is hereby granted, free of charge, to any person obtaining a copy of this
  * software and associated documentation files (the "Software"), to deal in the Software
  * without restriction, including without limitation the rights to use, copy, modify,
  * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
  * permit persons to whom the Software is furnished to do so, subject to the following
  * conditions:
  *
  * The above copyright notice and this permission notice shall be
  * included in all copies or substantial portions of the Software.
  *
  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
  * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
  * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
  * OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  */

import { Utils } from "./Utils";

/*
 * @hidden
 */
export class Profile {

  // claims supported by AAD id_tokens
  acr: string;
  amr: Array<string>;
  appid: string;
  appidacr: string;
  at_hash: string;
  aud: string;
  auth_time: string;
  cloud_instance_name: string;
  cloud_instance_host_name: string;
  c_hash: string;
  email: string;
  exp: string;
  family_name: string;
  given_name: string;
  groups: Array<string>;
  home_oid: string;
  iat: string;
  idp: string;
  iss: string;
  msgraph_host: string;
  name: string;
  nbf: string;
  nonce: string;
  nickname: string;
  oid: string;
  preferred_username: string;
  roles: Array<string>;
  scp: string;
  sub: string;
  tid: string;
  unique_name: string;
  upn: string;
  ver: string;

  rawIdToken: string;
  decodedIdToken: Object

  constructor(rawIdToken: string) {
    if (Utils.isEmpty(rawIdToken)) {
      throw new Error("null or empty raw idtoken");
    }
    try {
      this.rawIdToken = rawIdToken;
      this.decodedIdToken = Utils.extractIdToken(rawIdToken);
      if (this.decodedIdToken) {
        if (this.decodedIdToken.hasOwnProperty("acr")) {
          this.acr = this.decodedIdToken["acr"];
        }
      
        if (this.decodedIdToken.hasOwnProperty("amr")) {
          this.amr = this.decodedIdToken['amr'];
        }
      
        if (this.decodedIdToken.hasOwnProperty("appid")) {
          this.appid = this.decodedIdToken["appid"];
        }
      
        if (this.decodedIdToken.hasOwnProperty("appidacr")) {
          this.appidacr = this.decodedIdToken["appidacr"];
        }

        if (this.decodedIdToken.hasOwnProperty("at_hash")) {
          this.at_hash = this.decodedIdToken["at_hash"];
        }
      
        if (this.decodedIdToken.hasOwnProperty("aud")) {
          this.aud = this.decodedIdToken["aud"];
        }
      
        if (this.decodedIdToken.hasOwnProperty("auth_time")) {
          this.auth_time = this.decodedIdToken["auth_time"];
        }
      
        if (this.decodedIdToken.hasOwnProperty("cloud_instance_name")) {
          this.cloud_instance_name = this.decodedIdToken["cloud_instance_name"];
        }
      
        if (this.decodedIdToken.hasOwnProperty("cloud_instance_host_name")) {
          this.cloud_instance_host_name = this.decodedIdToken["cloud_instance_host_name"];
        }

        if (this.decodedIdToken.hasOwnProperty("c_hash")) {
          this.c_hash = this.decodedIdToken["c_hash"];
        }

        if (this.decodedIdToken.hasOwnProperty("email")) {
          this.email = this.decodedIdToken["email"];
        }

        if (this.decodedIdToken.hasOwnProperty("exp")) {
          this.exp = this.decodedIdToken["exp"];
        }

        if (this.decodedIdToken.hasOwnProperty("family_name")) {
          this.family_name = this.decodedIdToken["family_name"];
        }

        if (this.decodedIdToken.hasOwnProperty("given_name")) {
          this.given_name = this.decodedIdToken["given_name"];
        }

        if (this.decodedIdToken.hasOwnProperty("groups")) {
          this.groups = this.decodedIdToken["groups"];
        }

        if (this.decodedIdToken.hasOwnProperty("home_oid")) {
          this.home_oid = this.decodedIdToken["home_oid"];
        }

        if (this.decodedIdToken.hasOwnProperty("iat")) {
          this.iat = this.decodedIdToken["iat"];
        }

        if (this.decodedIdToken.hasOwnProperty("idp")) {
          this.idp = this.decodedIdToken["idp"];
        }

        if (this.decodedIdToken.hasOwnProperty("iss")) {
          this.iss = this.decodedIdToken["iss"];
        }

        if (this.decodedIdToken.hasOwnProperty("msgraph_host")) {
          this.msgraph_host = this.decodedIdToken["msgraph_host"];
        }

        if (this.decodedIdToken.hasOwnProperty("name")) {
          this.name = this.decodedIdToken["name"];
        }

        if (this.decodedIdToken.hasOwnProperty("nbf")) {
          this.nbf = this.decodedIdToken["nbf"];
        }

        if (this.decodedIdToken.hasOwnProperty("nonce")) {
          this.nonce = this.decodedIdToken["nonce"];
        }

        if (this.decodedIdToken.hasOwnProperty("nickname")) {
          this.nickname = this.decodedIdToken["nickname"];
        }

        if (this.decodedIdToken.hasOwnProperty("oid")) {
          this.oid = this.decodedIdToken["oid"];
        }

        if (this.decodedIdToken.hasOwnProperty("preferred_username")) {
          this.preferred_username = this.decodedIdToken["preferred_username"];
        }

        if (this.decodedIdToken.hasOwnProperty("roles")) {
          this.roles = this.decodedIdToken["roles"];
        }

        if (this.decodedIdToken.hasOwnProperty("scp")) {
          this.scp = this.decodedIdToken["scp"];
        }

        if (this.decodedIdToken.hasOwnProperty("sub")) {
          this.sub = this.decodedIdToken["sub"];
        }
        if (this.decodedIdToken.hasOwnProperty("tid")) {
          this.tid = this.decodedIdToken["tid"];
        }
        if (this.decodedIdToken.hasOwnProperty("unique_name")) {
          this.unique_name = this.decodedIdToken["unique_name"];
        }
        if (this.decodedIdToken.hasOwnProperty("upn")) {
          this.upn = this.decodedIdToken["upn"];
        }
        if (this.decodedIdToken.hasOwnProperty("ver")) {
          this.ver = this.decodedIdToken["ver"];
        }
      }
    } catch (e) {
      throw new Error("Failed to parse the returned id token");
    }
  }
}
