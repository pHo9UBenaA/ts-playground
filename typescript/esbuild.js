const glob = require('glob');
const entryPoints = glob.sync('./src/ts/*.ts');

const options = {
	entryPoints,
	outbase: './src/ts',
	outdir: './src/dist',
	platform: 'browser',
	external: [],
	bundle: true,
	tsconfig: './tsconfig.json',
};

const { build } = require('esbuild');
build(options).catch((err) => {
	process.stderr.write(err.stderr);
	process.exit(1);
});

// // webpack.config.js
// const path = require('path');

// module.exports = {
//   entry: {
//     'index' : path.resolve(__dirname, '/src/ts/index.ts'),
//     'babylon' : path.resolve(__dirname, '/src/ts/babylon.ts')
//   },
//   output: {
//     filename: '[name].js',
//     path: path.resolve(`${__dirname}/src`, 'dist'),
//   },
//   module: {
//     rules: [
//       {
//         test: /\.tsx?$/,
//         use: "ts-loader",
//         exclude: /node_modules/,
//       },
//     ],
//   },
//   resolve: {
//     extensions: [".tsx", ".ts", ".js"],
//   },
//   mode: "development",
// };
