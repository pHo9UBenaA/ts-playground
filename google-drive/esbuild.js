const path = require('path');
const glob = require('glob');

const srcDirName = 'src';
const distDirName = 'dist';

const srcDir = path.join(__dirname, srcDirName);
const distDir = path.join(__dirname, distDirName);

const entryPoints = glob.sync(`${srcDir}/**/*.ts`);
const outdir = distDir;

const options = {
	entryPoints,
	outdir,
	outbase: './src',
	platform: 'node',
	external: [],
	bundle: true,
	tsconfig: './tsconfig.json',
};

const { build } = require('esbuild');
build(options).catch((err) => {
	process.stderr.write(err.stderr);
	process.exit(1);
});
