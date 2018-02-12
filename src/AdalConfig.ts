import { TokenReceivedCallback } from "./Callback";

export class AdalConfig {
  public tenant: string;
  public clientId: string;
  public redirectUri: string = "window.location.href";
  public instance: string = "https://login.microsoftonline.com/";
  public endpoints: Array<string>;
  public popUp: Boolean = false;
  public localLoginUrl: string;
  public displayCall : (urlNavigate : string) => void = null;
  public postLogoutRedirectUri: string = this.redirectUri;
  public cacheLocation: string = "sessionStorage";
  public anonymousEndpoints: Array<string> = null;
  public expireOffsetSeconds: number = 300;
  public correlationId: string;
  public loadFrameTimeout: number;
  public isAngular: boolean = false;
  public navigateToLoginRequestUrl: boolean = true;
  public loginResource: string;
  public callback: TokenReceivedCallback = null;
  public state: string;
  public extraQueryParameter: string;
  public logOutUri: string;

  constructor(config : AdalConfig) {

  }
}