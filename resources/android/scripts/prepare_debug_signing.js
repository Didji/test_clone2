#!/usr/bin/env node
/*
 * Pour pouvoir releaser une version android signée, un fichier release-signing.properties
 * contenant les infos du keystore doit être présent dans le répertoire platforms/android.
 * Ce répertoire n'étant pas versionné on le copie depuis un répertoire de resources avant
 * la phase de build, après la target cordova "prepare" (cf hook dans config/xml).
 */

var ncp = require('ncp').ncp;

module.exports = function(ctx) {	
	ncp.limit = 16;

	ncp(ctx.opts.projectRoot + '/resources/android/signing/debug-signing.properties', 
		ctx.opts.projectRoot + '/platforms/android/debug-signing.properties', 
		function (err) {
			if (err) {
				return console.error('Error while copying resources for signing debug artefact...', err);
			}
		}
	);
};