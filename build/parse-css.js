import fs from "fs";

let strict = false;

function log(string,position){
    string += ' @ ' + position;
    if(strict){
        throw new Error('Error: ' + string);
    }
    console.log('Ignoring ' + string);
}

/*--------------------------------------------------------------------------------------------------------------------*/
// STYLESHEET PARSE
/*--------------------------------------------------------------------------------------------------------------------*/

import parse from "css-parse";
import Style from "../src/renderer/Style";

const CSS_PROPERTY_MAP    = Style.CSS_PROPERTY_MAP;
const PropertyType        = Style.PropertyType;
const STYLE_PROPERTY_INFO = Style.PROPERTY_INFO;

const dataPathCssOut = '../src/StyleSheet.js';
const dataPathCss = '../style/style.css';
const dataCss = parse(fs.readFileSync(dataPathCss, 'utf8'), {source : dataPathCss});

let rules = [];
for(let rule of dataCss.stylesheet.rules){
    if(rule.type !== 'rule'){
        continue;
    }
    let position = rule.position.start.line + ':' + rule.position.start.column;
    let selectors = rule.selectors[0].split(' ');
    if(selectors.length > 1){
        log(`unsupported nested selectors: "${rule.selectors}"`,position);
        continue;
    }
    let declarations = [];
    for(let declaration of rule.declarations){
        if(declaration.type !== 'declaration'){
            continue;
        }
        position = declaration.position.start.line + ':' + declaration.position.start.column;

        let property = declaration.property;
        //filter vendor specific properties
        if(property.charAt(0) === '-'){
            log(`vendor-specific property: "${property}"`,position);
            continue;
        }
        //filter unsupported properties
        let propertyTransformed = CSS_PROPERTY_MAP[property];
        if(propertyTransformed === undefined){
            log(`vendor-specific property: "${property}"`,position);
            continue;
        }
        if(property.indexOf('%') !== -1){
            console.log(`Ignoring unsupported property format: "${property}"`,position);
        }
        /*------------------------------------------------------------------------------------------------------------*/
        // PARSE VALUE
        /*------------------------------------------------------------------------------------------------------------*/

        let info   = STYLE_PROPERTY_INFO[property];
        let values = declaration.value.split(' ');
        switch(info.type){

            // NUMBER
            case PropertyType.NUMBER:
                for(let i = 0; i < values.length; ++i){
                    let value = values[i];
                    let end = value.length;
                    if(value.indexOf('%') !== -1){
                        end--;
                    }else{
                        let back = value.substr(end - 3, 3);
                        if(back === 'rem'){
                            log(`unsupported property format: "${back}"`,position);
                            continue;
                        } else {
                            back = back.substr(1);
                            if(back === 'em'){
                                log(`unsupported property format: "${back}"`,position);
                                continue;
                            }else if(back === 'px'){
                                end -= 2;
                            }
                        }
                    }
                    value = +value.substr(0,end);
                    if(Number.isNaN(value)){
                        throw new Error(`Error parsing property: "${property}" value: "${value}"`);
                    }
                    values[i] = value;
                }
                break;

            // STRING
            case PropertyType.STRING:
                for(let value of values){
                    //validate values here
                }
                break;

            // MIXED
            case PropertyType.MULTI:
                throw new Error('Unhandled ' + property);
                break;

            // ERROR
            default:
                throw new Error(`Property type missing for property: "${property}" @ ${position}`);
        }

        declarations.push({
            property : propertyTransformed,
            value : values
        });
    }
    if(declarations.length === 0){
        continue;
    }

    rules.push({
        selectors : rule.selectors,
        declarations : declarations
    });
}

fs.writeFileSync(dataPathCssOut,
    'const StyleSheet = ' + JSON.stringify(rules) + ';\n' +
    'export default StyleSheet;'
);
