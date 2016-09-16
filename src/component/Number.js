import validateOption from 'validate-option';
import validateType from '../util/validateType';
import createHtml from '../util/createHtml';

import ObjectComponent from './ObjectComponent';
import ComponentPreset from './ComponentPreset';

const template = '<input type="number" value="1">';

export const DefaultConfig = Object.freeze({
    label : null,
    readonly : false,
    preset : null,
    min : null,
    max : null,
    dp : null,
    step : null,
    onChange : function(){},
    annotation : null
});

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
        this._state.dp = config.dp;
        this._state.step = config.step;
        this._state.preset = config.preset;

        //elements
        this._element.classList.add('type-input');

        const step = this._state.step;
        const dp = this._state.dp;
        this._elementInput = this._elementWrap.appendChild(createHtml(template));
        this._elementInput.setAttribute('step',(step || 1.0).toFixed(dp || 4));
        this._elementInput.addEventListener('input',()=>{
            if(this._state.readonly){
                return;
            }
            let value = this._elementInput.value;
            value = +value;
            value = Number.isNaN(value) ? (this._state.min || 0) : value;
            value = dp !== null ? value.toFixed(dp) : value;
            this.value = +value;
        });

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

    _setMinMax(key,value){
        this._state[key] = value;
        if(value === null){
            this._elementInput.removeAttribute(key);
            return;
        }
        this._elementInput.setAttribute(key,value);
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
        this._elementInput.value = this.value;
    }
}