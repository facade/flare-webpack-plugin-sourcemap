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

export function removeQuery(url: string) {
    const queryStringIndex = url.indexOf('?');

    return queryStringIndex < 0 ? url : url.substr(0, queryStringIndex);
}
