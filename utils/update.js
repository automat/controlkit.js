/**
 * update
 * Update the build-in style from ../src/style/style.css
 */

var fs = require('fs');

var string = fs.readFileSync('../src/style/style.css').toString();
	string = string.replace(/(\r\n|\n|\r)/gm,"");

var module =
	'var Style = { \n' +
	'	string : ' + '"' +  string + '"\n' +
	'}; \n' +
	'module.exports = Style;';

fs.writeFileSync('../src/core/document/Style.js',module,null,function(err){
	if(err) {
		console.log(err);
		process.exit(0);
	}
});

console.log("Built-in style updated.");
process.exit(1);