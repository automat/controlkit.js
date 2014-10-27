/**
 * build
 * Create a standalone version of controlKit with an optional custom style.
 */

var browserify = require('browserify'),
	controlKit = require('../src');

var args = process.argv.slice(2);


if(args.indexOf('-s') != -1){
	console.log(args);
	controlKit.Style.string = '';
}

if(args.indexOf('-o') != -1){
	
}



process.exit(1);