import validateOption from 'validate-option';
import validateType from '../util/validateType';
import createHtml from '../util/createHtml';

import ObjectComponent from './ObjectComponent';
import ComponentPreset from './ComponentPreset';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template = '<input type="number">';

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
    label : null,
    readonly : false,
    preset : null,
    min : null,
    max : null,
    fd : 4,
    step : 0.25,
    stepShiftMult: 2,
    onChange : function(){},
    annotation : null
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Number
/*--------------------------------------------------------------------------------------------------------------------*/

export default class Number_ extends ObjectComponent{
    /**
     * @param {SubGroup} parent - The parent sub-group
     * @param {Object} object - The target object
     * @param {String} key - The target object property key to mapped
     * @param {Object} config - The component configuration
     */
    constructor(parent,object,key,config){
        validateType(object,key,Number);

        config = validateOption(config,DefaultConfig);
        config.label = config.label == null ? key : config.label;

        super(parent,object,key,{
            label : config.label,
            annotation:config.annotation,
            onChange : config.onChange
        });

        //state
        this._state.readonly = config.readonly;
        this._state.min = config.min;
        this._state.max = config.max;
        this._state.fd = config.fd;
        this._state.step = config.step;
        this._state.stepShiftMult = config.stepShiftMult;
        this._state.preset = config.preset;

        //elements
        this._element.classList.add('type-input');
        this._elementInput = this._elementWrap.appendChild(createHtml(template));
        //input set step, min, max
        this._elementInput.setAttribute('step',this._state.step.toFixed(this._state.fd));
        this._elementInput.setAttribute('min',this._state.min);
        this._elementInput.setAttribute('max',this._state.max);

        const formatValueFromInput = (value)=>{
            this.value = this._elementInput.value = this._formatValue(value);
        };

        this._elementInput.addEventListener('input',()=>{
            if(this._state.readonly){
                return;
            }
            this.value = this._formatValue(this._elementInput.valueAsNumber);
        });
        //input format on enter
        this._elementInput.addEventListener('change',()=>{
            formatValueFromInput(this._elementInput.value);
        });
        //input format on step
        this._elementInput.addEventListener('keydown',(e)=>{
            if(this._state.readonly){
                return;
            }
            let step = this._state.step;

            if(step != null){
                //manual mult stepping
                if(e.shiftKey){
                    step *= this._state.stepShiftMult;
                    switch(e.code){
                        case 'ArrowUp':
                            formatValueFromInput(this._elementInput.valueAsNumber + step);
                            break;
                        case 'ArrowDown':
                            formatValueFromInput(this._elementInput.valueAsNumber - step);
                            break;
                    }
                }
                //build-in step
                else {
                    switch(e.code){
                        case 'ArrowUp':
                        case 'ArrowDown':
                            formatValueFromInput(this._elementInput.valueAsNumber);
                            break;
                    }
                }
            } else {
                //prevent stepping
                switch(e.code){
                    case 'ArrowUp':
                    case 'ArrowDown':
                        e.preventDefault();
                        break;
                }
            }
        });

        //input prevent mouse wheel stepping
        const onMouseWheel = (e)=>{e.preventDefault();};
        this._elementInput.addEventListener('mousewheel',onMouseWheel);
        this._elementInput.addEventListener('wheel',onMouseWheel);

        //preset selection
        this._preset = new ComponentPreset(this._elementInput);
        this._preset.on('change',(option)=>{
            this.value = option;
        });

        //init
        this.preset = this._state.preset;
        this.readonly = this._state.readonly;
        this.min = this._state.min;
        this.max = this._state.max;
        this.sync();
    }

    /**
     * Sets the min or max value.
     * @param key
     * @param value
     * @private
     */
    _setMinMax(key,value){
        this._state[key] = value;
        if(value === null){
            this._elementInput.removeAttribute(key);
            return;
        }
        this._elementInput.setAttribute(key,value);
        this.sync();
    }

    /**
     * Formats a value based on min / max constrains and fractional digits allowed.
     * @param x
     * @return {*}
     * @private
     */
    _formatValue(x){
        const fd  = this._state.fd;
        const min = this._state.min;
        const max = this._state.max;
        x = +x;
        if(min != null && max != null){
            x = Number.isNaN(x) ? min : Math.max(min,Math.min(x,max));
        } else if(min != null){
            x = Number.isNaN(x) ? min : Math.max(min,x);
        } else if(max != null){
            x = Number.isNaN(x) ? max : Math.min(x,max);
        } else {
            x = Number.isNaN(x) ? 0 : x;
        }
        x = fd != null ? x.toFixed(fd) : x;
        return x;
    }

    /**
     * Sets the available presets to be used.
     * @param {Number[]|null} value
     */
    set preset(value){
        if(value != null){
            validateType(value,Array);
            for(const item of value){
                validateType(item,Number);
            }
        }
        this._preset.options = this._state.preset = value || null;
        this._preset.enable = !!value;
    }

    /**
     * Returns the current presets.
     * @returns {Number[]|null}
     */
    get preset(){
        return this._state.preset ? this._state.preset.slice(0) : null;
    }

    /**
     * Sets a minimum value for the property. If set to null the value gets cleared.
     * @param {Number|null} value
     */
    set min(value){
        if(value != null){
            validateType(value,Number);
        }
        this._setMinMax('min',value);
    }

    /**
     * Returns the minimum value set for the property. Returns null if unset.
     * @returns {Number|null}
     */
    get min(){
        return this._state.min;
    }

    /**
     * Sets a maximum value for the property. If set to null the value gets cleared.
     * @param {Number|null} value
     */
    set max(value){
        if(value != null){
            validateType(value,Number);
        }
        this._setMinMax('max',value);
    }

    /**
     * Returns the maximum value set for the property. Returns null if unset.
     * @returns {Number|null}
     */
    get max(){
        return this._state.max;
    }

    /**
     * If true the component only displays the current value of the property.
     * @param {Boolean} value
     */
    set readonly(value){
        validateType(value,Boolean);
        this._elementInput.classList[value ? 'add' : 'remove']('readonly');
        this._elementInput.readOnly = value;
        this._preset.enable = value;
        this._state.readonly = value;
    }

    /**
     * Returns true if the component is read-only.
     * @returns {Boolean}
     */
    get readonly(){
        return this._state.readonly;
    }

    /**
     * Forces the component to sync with its underlying property e.g. in case it
     * got changed externally.
     */
    sync(){
        this._elementInput.value = this._formatValue(this.value);
    }
}