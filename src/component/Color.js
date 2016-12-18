import validateOption from 'validate-option';
import validateType from '../util/validate-type';
import createHtml from '../util/create-html';

import ObjectComponent from './ObjectComponent';
import ComponentPreset from './ComponentPreset';
import {CSSColorStringMap} from './ColorString';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<div class="input-background">
        <div class="color-batch" style="background-color:red;">#ff0000</div>
    </div>`;

/**
 * Number default config
 * @type {Object}
 * @property {string} label - The component label
 * @property {boolean} readonly - If true, the component is readonly
 * @property {number} preset - A set of preset values to choose from
 * @property {number} min - Value min value
 * @property {number} max - Value max value
 * @property {number} fd - Number fo fractional digits displayed.
 * @property {number} step - The amount stepped when pressing up/down keys.
 * @property {number} stepShiftMult - The amount the stepping value gets multiplied with when holding shift while stepping.
 * @property {function} onChange - Callback on value change.
 * @property {null} annotation - A component annotation.
 */
export const DefaultConfig = Object.freeze({
    id : null,
    label : null,
    readonly : false,
    preset : null,
    onChange : function(){},
    annotation : null,
    colorType : null
});

function validateColorStringRgba(x){
    if(x.indexOf('rgba') == -1){
        throw new Error(`Invalid rgba color string format ${x}.`);
    }
}

function isColorString(x){

}

function isColorFloatv(){
    
}

function isColorIntv(){
    
}

function validateColorArray(x){
    validateType(x,Array);
    for(let i = 0; i < x.length; ++i){
        validateType(x[i],Number);
    }
}

function validateColorString(x){
    validateType(x,String);
    if(x[0] != '#'){
        //string rgba
        if(x.indexOf('rgba') != -1){

        }
        //string rgb
        else if(x.indexOf("rgb") != -1){

        }
        //color string
        else{
            if(true){
                return;
            }
        }

    } else {
        //validate hex
    }
    throw new Error(`Invalid string color description ${x}.`);
}

function expandColorFloatv(x){
    if(x.length == 4){
        return x;
    }
    if(x.length == 1){
        return [x[0],x[0],x[0],1];
    }
    if(x.length == 2){
        return [x[0],x[0],x[0],x[1]];
    }
    if(x.length == 3){
        return [x[0],x[1],x[2],1];
    }
    throw new Error(`Invalid floatv color length ${x.length}`);
}

export const Type = Object.freeze({
    STRING : 'string',
    ARRAY : 'array'
});

export const ColorType = Object.freeze({
    STRING_HEX : 'string-hex', //#ffffff or #fff
    STRING_RGB : 'string-rgb', //rgb(255,255,255)
    STRING_RGBA : 'string-rgba', //rgba(255,255,255,1.0)
    STRING_NAME : 'string-name', //white or White
    ARRAY_INT_2 : 'array-int-2', //[255,1.0]
    ARRAY_INT_3 : 'array-int-3', //[255,255,255]
    ARRAY_INT_4 : 'array-int-4', //[255,255,255,1.0]
    ARRAY_FLOAT_2 : 'array-float-2', //[1.0,1.0]
    ARRAY_FLOAT_3 : 'array-float-3', //[1.0,1.0,1.0]
    ARRAY_FLOAT_4 : 'array-float-4' //[1.0,1.0,1.0,1.0]
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Color
/*--------------------------------------------------------------------------------------------------------------------*/

export default class Color extends ObjectComponent{
    constructor(parent,object,key,config){
        if(object[key] === null){
            throw new Error(`Object value with key "${key}" is null.`);
        }
        if(object[key] === undefined){
            throw new Error(`Object value with key "${key}" is undefined.`);
        }
        if(!(typeof object[key] == 'string' || object[key] instanceof String || object[key] instanceof Array)){
            throw new Error(`Object value with key "${key}" is invalid property type. Must be "string" or "array".`);
        }

        config = validateOption(config,DefaultConfig);

        let type = null;
        if(!config.colorType){
            if(object[key] instanceof Array){
                validateColorArray()
            }
        }

        super(parent,object,key,{
            id : config.id,
            label : config.label,
            annotation:config.annotation,
            onChange : config.onChange
        });

        //state
        this._state.type = type;
        this._state.preset = config.preset;

        //elements
        this._element.classList.add('type-input');
        this._elementWrap.appendChild(createHtml(template));
        this._elementBatch = this._element.querySelector('.color-batch');

        //preset selection
        this._preset = new ComponentPreset(this._input.element);
        this._preset.on('change',(option)=>{
            // this.value = option;
            // this.sync();
        });

        //init
        this.preset = this._state.preset;
        this.sync();
    }

    sync(){
        const value = this.value;
        switch(this._state.type){
            case Type.STRING:
                validateType(value,String);
                break;
            case Type.ARRAY:
                validateColorArray(value);

                break;
            default:
                throw new Error(`Invalid type "${this._state.type}".`);
        }

        this._elementBatch.style.background = this.value;
        this._elementBatch.innerText = this.value;
    }
}