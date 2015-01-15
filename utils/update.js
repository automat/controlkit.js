/**
 * update
 * Update the build-in style from ../src/style/style.css
 */

process.chdir(__dirname);

var fs 		   = require('fs'),
	CleanCSS   = require('clean-css'),
	browserify = require('browserify'),
	UglifyJS   = require('uglify-js');

fs.writeFileSync('../lib/core/document/Style.js',
	'var Style = { \n' +
	'	string : ' + '"' +  new CleanCSS().minify(
			fs.readFileSync('../style/style.css').toString() ) + '"\n' +
	'}; \n' +
	'module.exports = Style;',
	null,function(err){
	if(err) {
		console.log(err);
		process.exit(1);
	}
});

browserify('../index.js',{standalone:'ControlKit',debug:true})
	.bundle()
 	.pipe(fs.createWriteStream('../bin/controlKit.js')
		.on('close',function(){
			fs.writeFileSync('../bin/controlKit.min.js',
				UglifyJS.minify(this.path).code);
	}));
