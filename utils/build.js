/**
 * build
 * Create a standalone version of controlKit with a custom style.
 */

var fs = require('fs');

var args = process.argv.slice(2);
var io   = args.indexOf('-o'),
	is   = args.indexOf('-s');

function esc(msg){
	console.log(msg);
	process.exit(1);
}

if(args.length != 4){
	esc('Wrong argl. Usage: build -s customStylePath -o outFileDir');
} else if( io == -1){
	esc('-o outFileDir argument missing.');
} else if( is == -1){
	esc('-s customStylePath argument missing');
}

var path = require('path'),
	root = process.cwd();

var through    = require('through'),
	CleanCSS   = require('clean-css'),
	browserify = require('browserify'),
	UglifyJS   = require('uglify-js');

process.chdir(__dirname);

var outFileDir       = path.join(root,args[io + 1]),
	customStylePath  = path.join(root,args[is + 1]),
	defaultStylePath = path.resolve('../lib/core/document/Style.js');

var style = through(function(){
						this.queue('var Style = { string : "' +
								   new CleanCSS().minify(fs.readFileSync(customStylePath).toString()) +
						           '" }; module.exports = Style;');
					});

browserify('../index.js',{
	standalone:'ControlKit',
	debug:true})
	.transform(function(file){
		return file !== defaultStylePath ? through() : style;})
	.bundle()
	.pipe(fs.createWriteStream(
		path.join(outFileDir,'controlKit.js')).on(
		'close', function(){
			fs.writeFileSync(path.join(outFileDir,'controlKit.min.js'),
							 UglifyJS.minify(this.path).code);
		}));