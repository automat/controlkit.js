const fs = require('fs');
const CleanCSS = require('clean-css');

process.chdir(__dirname);

const PATH_STYLE = '../style/style.css';
const PATH_STYLE_COMPILED = '../src/Style.js';
const PATTERN_SVG_IMAGE = new RegExp('assets\/images(.*)(?:svg)','g');
const PATTERN_SINGLE_QUOTE = new RegExp("'",'g');
const PATTERN_WHITE_SPACE = new RegExp(" ",'g');

let style = fs.readFileSync(PATH_STYLE,'utf8');

// inline svg assets
const assetsSvg = style.match(PATTERN_SVG_IMAGE);
for(const string of assetsSvg){
    const path = '../style/' + string;
    const image = 'data:image/svg+xml;utf8,' + fs.readFileSync(path,'utf8');
    style = style.replace(string,image);
}

style = style.replace(PATTERN_SINGLE_QUOTE,'"');
style = new CleanCSS().minify(style).styles;

const file = `const css = '${style}';\nexport default css;`;
fs.writeFileSync(PATH_STYLE_COMPILED,file,{encoding:'utf8'});