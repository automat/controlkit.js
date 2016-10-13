import validateOption from 'validate-option';
import deepequal from 'deep-equal';
import validateType from '../util/validateType';
import createHtml from '../util/createHtml';
import {normalize,clamp} from '../util/MathUtils';

import ObjectComponent from './ObjectComponent';
import NumberInputInternal from './NumberInputInternal';

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
 *
 * @type {Object}
 */
export const DefaultConfig = Object.freeze({
    label : null,
    labelRatio : null,
    type: 'float',
    range : [0,1],
    fd : 2,
    step : 1,
    numberInput : true,
    onChange : function(){},
    annotation : null
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
    constructor(parent,object,key,config){
        validateType(object,key,Number);

        config = validateOption(config,DefaultConfig);
        config.label = config.label == null ? key : config.label;

        if(!config.type || !Type[('' + config.type).toUpperCase()]){
            throw new Error(`Invalid type "${config.type}".`);
        }

        super(parent,object,key,{
            label : config.label,
            labelRatio : config.labelRatio,
            annotation : config.annotation,
            onChange : config.onChange
        });

        //state
        this._state.type = config.type;
        this._state.range = config.range;
        this._state.numberInput = config.numberInput;
        this._state.dragging = false;

        //optional input
        this._input = null;

        //elements
        this._element.classList.add('type-input');
        if(this._state.numberInput){
            let fd = 0;
            let step = config.step || 1;
            switch(this._state.type){
                case Type.FLOAT:
                    fd = 2;
                    break;
                case Type.INT:
                    fd = 0;
                    step = step.toFixed(0);
                    break;
            }

            this._input = new NumberInputInternal({
                min : this._state.range[0],
                max : this._state.range[1],
                fd,step
            });
            const setValue = ()=>{
                this.value = this._input.value;
                this.sync();
            };
            this._input.on('change',setValue);
            this._input.on('input',setValue);

            this._elementWrap.appendChild(createHtml(templateNumber));
            this._elementWrap.querySelector('.slider-wrap-number').appendChild(this._input.element);
        } else {
            this._elementWrap.appendChild(createHtml(template));
        }
        this._elementSlider = this._element.querySelector('.slider');
        this._elementTrack = this._element.querySelector('.slider-track');
        this._elementHandle = this._element.querySelector('.slider-handle');

        //listener slider
        const setValue = (pageX)=>{
            const rect = this._elementTrack.getBoundingClientRect();
            const width = rect.width;
            let norm  = Math.max(0,Math.min(pageX - rect.left,width)) / width;
            let value = this.min + norm * (this.max - this.min);
            switch(this._state.type){
                case Type.FLOAT:
                    this.value = value;
                    break;
                case Type.INT:
                    this.value = Math.ceil(value);
                    break;
            }
            this.sync();
        };
        const onMouseDown = (e)=>{
            this._state.dragging = true;
            setValue(e.pageX);
        };
        const onMouseMove = (e)=>{
            if(!this._state.dragging){
                return;
            }
            setValue(e.pageX);
        };
        const onMouseUp = (e)=>{
            if(!this._state.dragging){
                return;
            }
            this._state.dragging = false;
            setValue(e.pageX);
        };

        this._elementSlider.addEventListener('mousedown',onMouseDown);
        document.addEventListener('mousemove',onMouseMove);
        document.addEventListener('mouseup',onMouseUp);

        //remove listeners on controlkit cleanup
        this._removeEventListeners = function(){
            document.removeEventListener('mousemove',onMouseMove);
            document.removeEventListener('mouseup',onMouseUp);
        };

        //init
        this.range = this._state.range;
        this.sync();
    }

    /**
     * Returns true if the slider has an additional number input field.
     * @return {boolean|*}
     */
    hasNumberInput(){
        return this._state.numberInput;
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
        const differs = deepequal(value,this._state.range);
        this._state.range = value.slice(0);
        if(differs){
            const min = this._state.range[0];
            const max = this._state.range[1];

            if(this._state.numberInput){
                this._input.min = min;
                this._input.max = max;
            }

            this.value = Math.max(min,Math.min(this.value,max));
        }
    }

    /**
     * Returns the min max range
     * @returns {Number[]}
     */
    get range(){
        return this._state.range.slice(0);
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
        return this._state.range[0];
    }

    /**
     * Returns the range max value.
     * @returns {Number}
     */
    get max(){
        return this._state.range[1];
    }

    /**
     * Forces the component to sync with its underlying property e.g. in case it
     * got changed externally.
     */
    sync(){
        const width = +this._elementTrack.offsetWidth;
        const value = clamp(normalize(this.value,this.min,this.max),0.0,1.0);
        this._elementHandle.style.right = (1.0 - value) * width + 'px';
        if(this._state.numberInput){
            this._input.value =  this.value;
        }
    }

}