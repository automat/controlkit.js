import validateOption from 'validate-option';
import deepequal from 'deep-equal';
import validateType from '../util/validate-type';
import {normalize,clamp} from '../util/math-utils';
import {attachMouseListenersDocumentExtended} from '../util/listener-utils';

import ObjectComponent from './object-component';
import NumberInputInternal from './internal/number-input-internal';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<div class="slider">
        <div class="slider-track">
            <div class="slider-handle"></div>
        </div>
     </div>`;

const templateNumber =
    `<div class="slider-wrap-number">
        <div class="wrap-slider">
            <div class="slider">
                <div class="slider-track">
                    <div class="slider-handle"></div>
                </div>
            </div>
        </div>
     </div>`;

/**
 * Slider default config
 * @type {Object}
 */
export const DefaultConfig = Object.freeze({
    id : null,
    label : null,
    labelRatio : null,
    type: 'float',
    range : [0,1],
    fd : 2,
    step : 1,
    numberInput : true,
    onChange : function(){},
    annotation : null,
    color : null
});

/**
 * Slider Type
 * @type {Object}
 * @property {string} FLOAT
 * @property {string} INT
 */
export const Type = Object.freeze({
    FLOAT : 'float',
    INT : 'int'
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Slider
/*--------------------------------------------------------------------------------------------------------------------*/

export default class Slider extends ObjectComponent{
    /**
     * @constructor
     * @param parent
     * @param object
     * @param key
     * @param config
     */
    constructor(parent,object,key,config){
        validateType(object,key,Number);

        config = validateOption(config,DefaultConfig);
        config.label = config.label == null ? key : config.label;

        if(!config.type || !Type[('' + config.type).toUpperCase()]){
            throw new Error(`Invalid type "${config.type}".`);
        }

        super(parent,object,key,{
            id : config.id,
            label : config.label,
            labelRatio : config.labelRatio,
            annotation : config.annotation,
            onChange : config.onChange,
            template : config.numberInput ? templateNumber : template
        });

        //state
        this._type = config.type;
        this._range = config.range;
        this._numberInput = config.numberInput;
        this._color = config.color;
        this._dragging = false;

        //optional input
        this._input = null;

        //elements
        this._element.classList.add('type-input');
        if(this._numberInput){
            let fd = 0;
            let step = config.step || 1;
            switch(this._type){
                case Type.FLOAT:
                    fd = 2;
                    break;
                case Type.INT:
                    fd = 0;
                    step = +step.toFixed(0);
                    break;
            }

            this._input = new NumberInputInternal({
                element: this._element.querySelector('input'),
                min : this._range[0],
                max : this._range[1],
                fd,
                step
            });
            const setValue = ()=>{
                this.value = this._input.value;
                this.sync();
            };
            this._input.on('change',setValue);
            this._input.on('input',setValue);

            this._element.querySelector('.slider-wrap-number').appendChild(this._input.element);
        }

        this._elementSlider = this._element.querySelector('.slider');
        this._elementTrack = this._element.querySelector('.slider-track');
        this._elementHandle = this._element.querySelector('.slider-handle');

        //listener slider
        const setValue = (e)=>{
            const rect = this._elementTrack.getBoundingClientRect();
            const width = rect.width;
            let norm  = Math.max(0,Math.min(e.pageX - rect.left,width)) / width;
            let value = this.min + norm * (this.max - this.min);
            switch(this._type){
                case Type.FLOAT:
                    this.value = value;
                    break;
                case Type.INT:
                    this.value = Math.ceil(value);
                    break;
            }
            this.sync();
        };
        this._removeEventListeners = attachMouseListenersDocumentExtended(
            this._elementSlider,{
                onMouseDown : setValue,
                onMouseDrag : setValue,
                onMouseUp : setValue
            }
        );

        //init
        this.range = this._range;
        this.color = this._color;
        this.sync();
    }

    static get typeName(){
        return 'slider';
    }

    /**
     * Returns true if the slider has an additional number input field.
     * @return {boolean|*}
     */
    hasNumberInput(){
        return this._numberInput;
    }

    /**
     * Sets the min max range.
     * @param {Number[]} value
     */
    set range(value){
        validateType(value,Array);
        for(const item of value){
            validateType(item,Number);
        }
        const differs = !deepequal(value,this._range);
        this._range = value.slice(0);
        if(differs){
            const min = this._range[0];
            const max = this._range[1];

            if(this._numberInput){
                this._input.min = min;
                this._input.max = max;
            }
            const value = Math.max(min,Math.min(this.value,max));
            // update slider new range
            if(value == this.value){
                this.sync();
                return;
            }
            this.value = value;
        }
    }

    /**
     * Returns the min max range
     * @returns {Number[]}
     */
    get range(){
        return this._range.slice(0);
    }

    /**
     * Sets the range min value.
     * @param {Number} value
     */
    set min(value){
        this.range = [value,this.max];
    }

    /**
     * Sets the range max value.
     * @param {Number} value
     */
    set max(value){
        this.range = [this.min,value];
    }

    /**
     * Returns the range min value.
     * @returns {Number}
     */
    get min(){
        return this._range[0];
    }

    /**
     * Returns the range max value.
     * @returns {Number}
     */
    get max(){
        return this._range[1];
    }

    /**
     * Sets the slider handle color. If null the default color is used.
     * @param {null|string} value
     */
    set color(value){
        this._color = value;
        this._elementHandle.style.background = value;
    }

    /**
     * Returns the handle color set. Returns null if the default color is used.
     * @return {null|string}
     */
    get color(){
        return this._color;
    }

    /**
     * Forces the component to sync with its underlying property e.g. in case it
     * got changed externally.
     */
    sync(){
        const width = +this._elementTrack.offsetWidth;
        const value = clamp(normalize(this.value,this.min,this.max),0.0,1.0);
        this._elementHandle.style.right = (1.0 - value) * width + 'px';
        if(this._numberInput){
            this._input.value =  this.value;
        }
    }
}