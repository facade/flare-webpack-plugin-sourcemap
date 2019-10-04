import webpack = require('webpack');
import axios from 'axios';

type PluginOptions = {
    key: string;
    apiEndpoint: string;
};

type Sourcemap = {
    filename: string;
    content: string;
};

class FlareWebpackPluginSourcemap {
    key: PluginOptions['key'];
    apiEndpoint: PluginOptions['apiEndpoint'];

    constructor({ key, apiEndpoint }: PluginOptions) {
        this.key = key;
        this.apiEndpoint = apiEndpoint || 'https://flareapp.io/api/sourcemaps';
    }

    apply(compiler: webpack.Compiler) {
        compiler.hooks.afterEmit.tapPromise('FlareWebpackPluginSourcemap', compilation =>
            this.sendSourcemaps(compilation)
        );
    }

    sendSourcemaps(compilation: webpack.compilation.Compilation): Promise<void> {
        const sourcemaps = this.getSourcemaps(compilation);

        return this.uploadSourcemaps(sourcemaps).then(() => Promise.resolve());
    }

    getSourcemaps(compilation: webpack.compilation.Compilation): Array<Sourcemap> {
        return compilation
            .getStats()
            .toJson()
            .chunks.reduce(
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

    uploadSourcemaps(sourcemaps: Array<Sourcemap>): Promise<Array<void>> {
        return Promise.all(
            sourcemaps.map(sourcemap => {
                axios
                    .post(this.apiEndpoint, {
                        key: this.key,
                        version_id: 'test_version',
                        relative_filename: sourcemap.filename,
                        sourcemap: sourcemap.content, // TODO: gzip the string (https://www.npmjs.com/package/node-gzip)
                    })
                    .catch(err => {
                        console.error(err);
                        // TODO: catch some response statuses & display error messages for these (401, …)
                    });
            })
        );
    }
}

module.exports = FlareWebpackPluginSourcemap;
