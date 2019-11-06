import { Compiler, DefinePlugin, compilation } from 'webpack';
import { deflateRawSync } from 'zlib';
import { AxiosError } from 'axios';
import * as axios from 'axios';
import { getGitInfo, flareLog, uuidv4 } from './util';

type PluginOptions = {
    key: string;
    apiEndpoint: string;
    runInDevelopment: boolean;
    versionId: string;
    collectGitInformation: boolean;
};

type Sourcemap = {
    filename: string;
    content: string;
};

class FlareWebpackPluginSourcemap {
    key: PluginOptions['key'];
    apiEndpoint: PluginOptions['apiEndpoint'];
    runInDevelopment: PluginOptions['runInDevelopment'];
    versionId: PluginOptions['versionId'];
    collectGitInformation: PluginOptions['collectGitInformation'];

    constructor({
        key,
        apiEndpoint = 'https://flareapp.io/api/sourcemaps',
        runInDevelopment = false,
        versionId = uuidv4(),
        collectGitInformation = false,
    }: PluginOptions) {
        this.key = key;
        this.apiEndpoint = apiEndpoint;
        this.runInDevelopment = runInDevelopment;
        this.versionId = versionId;
        this.collectGitInformation = collectGitInformation;
    }

    apply(compiler: Compiler) {
        if (!this.verifyOptions(compiler)) {
            return;
        }

        new DefinePlugin({
            FLARE_SOURCEMAP_VERSION: JSON.stringify(this.versionId),
            FLARE_GIT_INFO:
                this.collectGitInformation && compiler.options.context
                    ? JSON.stringify(getGitInfo(compiler.options.context))
                    : {},
        }).apply(compiler);

        compiler.hooks.afterEmit.tapPromise('GetSourcemapsAndUploadToFlare', compilation => {
            flareLog('Uploading sourcemaps to Flare');

            return this.sendSourcemaps(compilation)
                .then(() => {
                    flareLog('Successfully uploaded sourcemaps to Flare.');
                })
                .catch(error => {
                    const errorMessage =
                        'Something went wrong while uploading sourcemaps to Flare. ' +
                        'Additional information may have been outputted above.';

                    compilation.errors.push(`@flareapp/flare-webpack-plugin-sourcemap: ${error}`);
                    compilation.errors.push(`@flareapp/flare-webpack-plugin-sourcemap: ${errorMessage}`);

                    flareLog(errorMessage);
                });
        });
    }

    verifyOptions(compiler: Compiler): boolean {
        if (!this.key) {
            flareLog('No Flare project key was provided, not uploading sourcemaps to Flare.', true);
            return false;
        }

        if (!this.runInDevelopment && compiler.options.mode === 'development') {
            flareLog('Running webpack in development mode, not uploading sourcemaps to Flare.');
            return false;
        }

        return true;
    }

    sendSourcemaps(compilation: compilation.Compilation): Promise<void> {
        return new Promise((resolve, reject) => {
            const sourcemaps = this.getSourcemaps(compilation);

            if (!sourcemaps.length) {
                flareLog('No sourcemap files were found. Make sure sourcemaps are being generated!', true);

                return reject();
            }

            Promise.all(sourcemaps.map(sourcemap => this.uploadSourcemap(sourcemap)))
                .then(() => resolve())
                .catch(error => {
                    flareLog(error, true);

                    return reject(error);
                });
        });
    }

    getSourcemaps(compilation: compilation.Compilation): Array<Sourcemap> {
        const chunks = compilation.getStats().toJson().chunks;

        if (!chunks) {
            return [];
        }

        return chunks.reduce(
            (sourcemaps, currentChunk) => {
                const filename = currentChunk.files.find(file => /\.js$/.test(file));
                const sourcemapUrl = currentChunk.files.find(file => /\.js\.map$/.test(file));

                if (filename && sourcemapUrl) {
                    const content = compilation.assets[sourcemapUrl].source();

                    sourcemaps = [...sourcemaps, { filename, content }];
                }

                return sourcemaps;
            },
            [] as Array<Sourcemap>
        );
    }

    uploadSourcemap(sourcemap: Sourcemap): Promise<void> {
        return new Promise((resolve, reject) => {
            const base64GzipSourcemap = deflateRawSync(sourcemap.content).toString('base64');

            // ts error: https://github.com/axios/axios/issues/1975
            axios
                .post(this.apiEndpoint, {
                    key: this.key,
                    version_id: this.versionId,
                    relative_filename: sourcemap.filename,
                    sourcemap: base64GzipSourcemap,
                })
                .then(() => resolve())
                .catch((error: AxiosError) => {
                    if (!error || !error.response) {
                        return reject('Something went wrong while uploading the sourcemaps to Flare.');
                    }

                    flareLog(`${error.response.status}: ${error.response.data.message}`, true);
                    console.error(error.response);

                    return reject(error);
                });
        });
    }
}

module.exports = FlareWebpackPluginSourcemap;
