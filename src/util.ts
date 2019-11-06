import { execSync } from 'child_process';

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

export function getGitInfo(path: string): GitInfo {
    return <GitInfo>{
        hash: clCommand(`git -C ${path} log --pretty=format:'%H' -n 1`),
        message: clCommand(`git -C ${path} log --pretty=format:'%s' -n 1`),
        tag: clCommand(`git -C ${path} describe --tags --abbrev=0`),
        remote: clCommand(`git -C ${path} config --get remote.origin.url`),
        isDirty: !!clCommand(`git -C ${path} status -s`),
    };
}

export function flareLog(message: string, isError: boolean = false) {
    const formattedMessage = '@flareapp/flare-webpack-plugin-sourcemap: ' + message;

    if (isError) {
        console.error(formattedMessage);
        return;
    }

    console.log(formattedMessage);
}

export function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (Math.random() * 16) | 0,
            v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}