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

export function getGitInfo(): GitInfo {
    try {
        return <GitInfo>{
            hash: clCommand("git log --pretty=format:'%H' -n 1"),
            message: clCommand("git log --pretty=format:'%s' -n 1"),
            tag: clCommand('git describe --tags --abbrev=0'),
            remote: clCommand('git config --get remote.origin.url'),
            isDirty: !!clCommand('git status -s'),
        };
    } catch (err) {
        flareLog('Failed getting git info. Reports will not have git information in their context.', true);
    }
}

export function flareLog(message: string, isError: boolean = false) {
    const formattedMessage = 'flare-webpack-plugin-sourcemap: ' + message;

    if (isError) {
        console.error('\n' + formattedMessage + '\n');
        return;
    }

    console.log('\n' + formattedMessage + '\n');
}
