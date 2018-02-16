import { Profile } from "./Profile";

export class User {
  userName: string;
  profile: Profile;

  private static _validAud: string;

  static setValidAud(validAud: string) {
    User._validAud = validAud.toLowerCase();
  }

  static createUser(idToken: string): User {
    var user = null;
    var profile = new Profile(idToken);
    if (profile.aud) {
      if (profile.aud.toLowerCase() === User._validAud) {
        user = {
          userName: '',
          profile: profile
        };

        if (profile.upn) {
          user.userName = profile.upn;
        } else if (profile.email) {
          user.userName = profile.email;
        }
      } else {
          window._logger.warn('IdToken has invalid aud field');
      }
    }

    return user;
  };
}