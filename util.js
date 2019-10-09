"use strict";
exports.__esModule = true;
var child_process_1 = require("child_process");
function clCommand(command) {
    try {
        return child_process_1.execSync(command, { cwd: __dirname, encoding: 'utf8' }).replace('\n', '');
    }
    catch (error) {
        return '';
    }
}
function getGitInfo() {
    try {
        return {
            hash: clCommand("git log --pretty=format:'%H' -n 1"),
            message: clCommand("git log --pretty=format:'%s' -n 1"),
            tag: clCommand('git describe --tags --abbrev=0'),
            remote: clCommand('git config --get remote.origin.url'),
            isDirty: !!clCommand('git status -s')
        };
    }
    catch (err) {
        flareLog('Failed getting git info. Reports will not have git information in their context.', true);
    }
}
exports.getGitInfo = getGitInfo;
function flareLog(message, isError) {
    if (isError === void 0) { isError = false; }
    var formattedMessage = 'flare-webpack-plugin-sourcemap: ' + message;
    if (isError) {
        console.error('\n' + formattedMessage + '\n');
        return;
    }
    console.log('\n' + formattedMessage + '\n');
}
exports.flareLog = flareLog;
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0, v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
exports.uuidv4 = uuidv4;
