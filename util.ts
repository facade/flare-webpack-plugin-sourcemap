import { execSync } from 'child_process';
import webpack = require('webpack');

type GitInfo = {
    hash: string;
    message: string;
    tag: string;
    remote: string;
    isDirty: boolean;
};

function clCommand(command: string) {
    try {
        return execSync(command, { cwd: __dirname, encoding: 'utf8' }).replace('\n', '');
    } catch (error) {
        return '';
    }
}

export function getGitInfo(path): GitInfo {
    return <GitInfo>{
        hash: clCommand(`git -C ${path} log --pretty=format:'%H' -n 1`),
        message: clCommand(`git -C ${path} log --pretty=format:'%s' -n 1`),
        tag: clCommand(`git -C ${path} describe --tags --abbrev=0`),
        remote: clCommand(`git -C ${path} config --get remote.origin.url`),
        isDirty: !!clCommand(`git -C ${path} status -s`),
    };
}

export function flareLog(message: string, isError: boolean = false) {
    const formattedMessage = 'flare-webpack-plugin-sourcemap: ' + message;

    if (isError) {
        console.error('\n' + formattedMessage + '\n');
        return;
    }

    console.log('\n' + formattedMessage + '\n');
}

export function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (Math.random() * 16) | 0,
            v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
