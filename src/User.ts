import { Utils } from "./Utils";

export class User {
    userName : string;
    profile: object;

    private static _validAud: string;

    static setValidAud(validAud: string) {
        User._validAud = validAud.toLowerCase();
    }

    static createUser(idToken: string): User {
        var user = null;
        var parsedJson = Utils.extractIdToken(idToken);
        if (parsedJson && parsedJson.hasOwnProperty('aud')) {
            if (parsedJson.aud.toLowerCase() === User._validAud) {

                user = {
                    userName: '',
                    profile: parsedJson
                };

                if (parsedJson.hasOwnProperty('upn')) {
                    user.userName = parsedJson.upn;
                } else if (parsedJson.hasOwnProperty('email')) {
                    user.userName = parsedJson.email;
                }
            } else {
                this.warn('IdToken has invalid aud field');
            }

        }

        return user;
    };
}