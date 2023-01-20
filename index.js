// Netlify Plugin: netlify-plugin-cache-jshash
// https://github.com/betabong/netlify-plugin-cache-jshash
//
// This plugin is essentially a wrapper around Netlify's native `cache-utils`:
// https://github.com/netlify/build/blob/master/packages/cache-utils/README.md

const MANIFEST_PATH = '.netlify-cache-jshash-manifest.json';
const fs = require('fs/promises');
const glob = require('fast-glob');

module.exports = {
	// Try to restore cache before build begins, if it exists
	onPreBuild: async ({ utils: { cache }, inputs }) => {
		if (await cache.restore(MANIFEST_PATH)) {
			const { list } = JSON.parse(await fs.readFile(MANIFEST_PATH));

			if (await cache.restore(list)) {
				const files = await cache.list(list);
				console.log(`Successfully restored: ${files.length} files in total.`);
			}
		} else {
			console.log(`A cache of '${inputs.paths.join(', ')}' doesn't exist (yet).`);
		}
	},

	// Only save/update cache if build was successful
	onSuccess: async ({ utils: { cache, status }, inputs }) => {
		const recentFiles = [];
		try {
			const { list } = JSON.parse(await fs.readFile(MANIFEST_PATH));
			recentFiles.push(...list);
		} catch (e) {
			// nothing
		}
		const filesToCache = await glob(inputs.paths, { dot: true, onlyFiles: true, ignore: recentFiles });
		await fs.writeFile(MANIFEST_PATH, JSON.stringify({ list: filesToCache }));

		if (await cache.save(filesToCache)) {
			const files = await cache.list(filesToCache);
			console.log(`Successfully cached: ${inputs.paths.join(', ')} ... ${files.length} files in total.`);

			// Show success & more detail in deploy summary
			status.show({
				title: `${files.length} files cached`,
				summary: 'These will be restored on the next build! ⚡',
				text: `${inputs.paths.join(', ')}`,
			});
		} else {
			// This probably happened because the default `paths` is set, so provide instructions to fix
			console.log(`Attempted to cache: ${inputs.paths.join(', ')} ... but failed. :(`);
			console.log("Try setting the 'paths' input appropriately in your netlify.toml configuration.");
		}
	},
};
