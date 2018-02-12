import { User } from "./User";

export type TokenReceivedCallback = (errorDesc: string, token: string, error: string, tokenType?: string) => void;
export type UserCallback = (error: string, user: User) => void;