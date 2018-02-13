import { Constants } from "./Constants";
import { Utils } from "./Utils";
import { AdalConfig } from "./AdalConfig";

export class Logging {

    constructor(private _config: AdalConfig) {

    }

    /**
     * Checks the Logging Level, constructs the Log message and logs it. Users need to implement/override this method to turn on Logging. 
     * @param {number} level  -  Level can be set 0,1,2 and 3 which turns on 'error', 'warning', 'info' or 'verbose' level logging respectively.
     * @param {string} message  -  Message to log.
     * @param {string} error  -  Error to log.
     */
    public log(level: number, message: string, error?: any): void {
        if (level <= window.Logging.level) {
            var timestamp = new Date().toUTCString();
            var formattedMessage = '';

            if (this._config.correlationId)
                formattedMessage = timestamp + ':' + this._config.correlationId + '-' + Utils.getLibVersion() + '-' + Constants.LEVEL_STRING_MAP[level] + ' ' + message;
            else
                formattedMessage = timestamp + ':' + Utils.getLibVersion() + '-' + Constants.LEVEL_STRING_MAP[level] + ' ' + message;

            if (error) {
                formattedMessage += '\nstack:\n' + error.stack;
            }

            window.Logging.log(formattedMessage);
        }
    }

    /**
     * Logs messages when Logging Level is set to 0.
     * @param {string} message  -  Message to log.
     * @param {string} error  -  Error to log.
     */
    public error(message: string, error?: any): void {
        this.log(Constants.LOGGING_LEVEL.ERROR, message, error);
    };

    /**
     * Logs messages when Logging Level is set to 1.
     * @param {string} message  -  Message to log.
     */
    public warn(message: string): void {
        this.log(Constants.LOGGING_LEVEL.WARN, message, null);
    };

    /**
     * Logs messages when Logging Level is set to 2.
     * @param {string} message  -  Message to log.
     */
    public info(message: string): void {
        this.log(Constants.LOGGING_LEVEL.INFO, message, null);
    };

    /**
     * Logs messages when Logging Level is set to 3.
     * @param {string} message  -  Message to log.
     */
    public verbose(message: string): void {
        this.log(Constants.LOGGING_LEVEL.VERBOSE, message, null);
    };
}
