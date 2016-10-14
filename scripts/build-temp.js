const argv = require('minimist')(process.argv.slice(2));

if(argv._.length == 0){
    throw new Error('File path missing.');
}

//TODO: Add option source-map external, uglifyjs, standalone

const fs = require('fs');
const path = require('path');
const browserify = require('browserify');
const babelify = require('babelify');
const brfs = require('brfs');

var bundle = '';
browserify([path.resolve(argv._[0])],{debug:true})
    .transform(babelify,{presets: ['es2015']})
    .transform(brfs)
    .bundle()
    .on('data',function(part){
        bundle += part;
    })
    .on('end',function(){
        fs.writeFileSync('./.temp/bundle.js',bundle);
        console.log('Done ✓');
    });


