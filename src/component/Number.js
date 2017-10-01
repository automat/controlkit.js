import validateOption from 'validate-option';
import validateType from '../util/validate-type';

import ObjectComponent from './object-component';
import NumberInputInternal from './internal/number-input-internal';
import ComponentPreset from './component-preset';

/*--------------------------------------------------------------------------------------------------------------------*/
// Defaults
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
    id : null,
    label : null,
    readonly : false,
    preset : null,
    min : null,
    max : null,
    fd : 4,
    dp : null, //deprecated
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
        config.fd = config.dp != null ? config.dp : config.fd;

        if(config.dp){
            console.warn('Number option dp is deprecated. Use fd to define the number of fractional digits displayed.');
        }

        super(parent,object,key,{
            id : config.id,
            label : config.label,
            annotation:config.annotation,
            onChange : config.onChange,
            template
        });

        //state
        this._state.preset = config.preset;

        //input
        this._input = new NumberInputInternal({
            element : this._element.querySelector('input'),
            readonly : config.readonly,
            min : config.min,
            max : config.max,
            fd : config.fd,
            step : config.step,
            stepShiftMult : config.stepShiftMult
        });

        this._input.on('input',()=>{
            this.value = this._input.value;
        });

        this._input.on('change',()=>{
            this.value = this._input.value;
        });

        //elements
        this._element.classList.add('type-input');

        //preset selection
        this._preset = new ComponentPreset(this._input.element);
        this._preset.on('change',(option)=>{
            this.value = option;
            this.sync();
        });

        //init
        this.preset = this._state.preset;
        this.sync();
    }

    /**
     * Returns the type name.
     * @return {string}
     */
    static get typeName(){
        return 'number';
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
     * Sets the amount to step the value while pressing arrow up / down key.
     * If null stepping gets deactivated.
     * @param {number|null} x
     */
    set step(x){
        this._input.step = x;
    }

    /**
     * Returns the stepping value. If null no stepping is deactivated.
     * @return {number|null}
     */
    get step(){
        return this._input.step;
    }

    /**
     * Sets the multiplier for value stepping while holding shift key.
     * If null step multiplication gets deactivated.
     * @param {number|null} x
     */
    set stepShiftMult(x){
        this._input.stepShiftMult = x;
    }

    /**
     * Returns the stepping multiplier. Returns null if deactivated.
     * @return {number|null}
     */
    get stepShiftMult(){
        return this._input.stepShiftMult;
    }


    /**
     * Sets a minimum value for the property. If set to null the value gets cleared.
     * @param {Number|null} value
     */
    set min(value){
        this._input.min = value;
        this.value = this._input.value;
    }

    /**
     * Returns the minimum value set for the property. Returns null if unset.
     * @returns {Number|null}
     */
    get min(){
        return this._input.min;
    }

    /**
     * Sets a maximum value for the property. If set to null the value gets cleared.
     * @param {Number|null} value
     */
    set max(value){
        this._input.max = value;
        this.value = this._input.value;
    }

    /**
     * Returns the maximum value set for the property. Returns null if unset.
     * @returns {Number|null}
     */
    get max(){
        return this._input.max;
    }

    /**
     * If true the component only displays the current value of the property.
     * @param {Boolean} value
     */
    set readonly(value){
        this._input.readonly = value;
        this._preset.enable = value;
    }

    /**
     * Returns true if the component is read-only.
     * @returns {Boolean}
     */
    get readonly(){
        return this._input.readonly;
    }

    /**
     * Forces the component to sync with its underlying property e.g. in case it
     * got changed externally.
     */
    sync(){
        this._input.value = this.value;
        this.value = this._input.value;
    }
}