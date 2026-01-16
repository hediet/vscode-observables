import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const banner = `/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/`;

// External packages that should not be bundled
const external = [
	'react',
	'react-dom',
	'react/jsx-runtime',
	'@vscode/observables',
];

/** @type {import('rollup').RollupOptions[]} */
export default [
	// Development build - preserves modules for better debugging
	{
		input: 'src/index.ts',
		output: {
			dir: 'dist',
			format: 'esm',
			sourcemap: true,
			preserveModules: true,
			preserveModulesRoot: 'src',
			banner,
		},
		external,
		plugins: [
			resolve(),
			typescript({
				tsconfig: './tsconfig.json',
				declaration: true,
				declarationDir: 'dist',
				rootDir: 'src',
			}),
		],
	},
	// Production build - single minified bundle
	{
		input: 'src/index.ts',
		output: {
			file: 'dist/index.min.js',
			format: 'esm',
			sourcemap: true,
			banner,
		},
		external,
		plugins: [
			resolve(),
			typescript({
				tsconfig: './tsconfig.json',
				declaration: false,
			}),
			terser({
				format: {
					comments: (node, comment) => {
						// Preserve license comments
						return comment.value.includes('Copyright');
					},
				},
			}),
		],
	},
];
