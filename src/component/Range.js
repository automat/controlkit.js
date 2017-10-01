import validateOption from 'validate-option';
import validateType from '../util/validate-type';

import ObjectComponent from './object-component';
import NumberInputInternal from './internal/number-input-internal';

/*--------------------------------------------------------------------------------------------------------------------*/
// Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<div class="range">
        <div class="range-item">
            <label>min</label>
            <input type="number" value="0">
        </div>
        <div class="range-item">
            <label>max</label>
            <input type="number" value="1">
        </div>
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

export default class Range extends ObjectComponent{
    /**
     * @param {SubGroup} parent - The parent sub-group
     * @param {Object} object - The target object
     * @param {String} key - The target object property key to mapped
     * @param {Object} config - The component configuration
     */
    constructor(parent,object,key,config){
        validateType(object,key,Array);
        validateType(object[key][0],Number);
        validateType(object[key][1],Number);

        config = validateOption(config,DefaultConfig);
        config.fd = config.dp != null ? config.dp : config.fd;

        if(config.dp){
            console.warn('Range option dp is deprecated. Use fd to define the number of fractional digits displayed.');
        }

        super(parent,object,key,{
            id : config.id,
            label : config.label,
            annotation:config.annotation,
            onChange : config.onChange,
            template
        });

        // input
        this._inputMin = new NumberInputInternal({
            element : this._element.querySelectorAll('input')[0],
            readonly : config.readonly,
            min : config.min,
            max : config.max,
            fd : config.fd,
            step : config.step,
            stepShiftMult : config.stepShiftMult
        });

        this._inputMax = new NumberInputInternal({
            element : this._element.querySelectorAll('input')[1],
            readonly : config.readonly,
            min : config.min,
            max : config.max,
            fd : config.fd,
            step : config.step,
            stepShiftMult : config.stepShiftMult
        });

        this._inputMin.on('input',()=>{
            this.value = [Math.min(this._inputMin.value,this._inputMax.value),this._inputMax.value];
            this.sync();
        });
        this._inputMax.on('input',()=>{
            this.value = [this._inputMin.value,Math.max(this._inputMin.value,this._inputMax.value)];
            this.sync();
        });

        // elements
        this._element.classList.add('type-input');

        // init
        this.sync();
    }

    /**
     * Returns the type name.
     * @return {string}
     */
    static get typeName(){
        return 'range';
    }

    /**
     * Sets the amount to step the value while pressing arrow up / down key.
     * If null stepping gets deactivated.
     * @param {number|null} x
     */
    set step(x){
        this._inputMin.step = this._inputMax.step = x;
    }

    /**
     * Returns the stepping value. If null no stepping is deactivated.
     * @return {number|null}
     */
    get step(){
        return this._inputMin.step;
    }

    /**
     * Sets the multiplier for value stepping while holding shift key.
     * If null step multiplication gets deactivated.
     * @param {number|null} x
     */
    set stepShiftMult(x){
        this._inputMin.stepShiftMult = this._inputMax.stepShiftMult = x;
    }

    /**
     * Returns the stepping multiplier. Returns null if deactivated.
     * @return {number|null}
     */
    get stepShiftMult(){
        return this._inputMin.stepShiftMult;
    }

    /**
     * If true the component only displays the current value of the property.
     * @param {Boolean} value
     */
    set readonly(value){
        this._inputMin.readonly = this._inputMax.readonly = value;
        this._preset.enable = value;
    }

    /**
     * Returns true if the component is read-only.
     * @returns {Boolean}
     */
    get readonly(){
        return this._inputMin.readonly;
    }

    /**
     * Forces the component to sync with its underlying property e.g. in case it
     * got changed externally.
     */
    sync(){
        const min = this.value[0];
        const max = this.value[1];
        this._inputMin.value = Math.min(min,max);
        this._inputMax.value = Math.max(min,max);
        this.value[0] = this._inputMin.value;
        this.value[1] = this._inputMax.value;
    }
}