import validateOption from 'validate-option';
import validateType from '../util/validate-type';

import ObjectComponent from './ObjectComponent';

const template = '<input type="checkbox">';

export const DefaultConfig = Object.freeze({
    label : null,
    onChange : function(){},
    annotation : null
});

export default class Checkbox extends ObjectComponent{
    /**
     * @param {SubGroup} parent - The parent sub-group
     * @param {Object} object - The target object
     * @param {String} key - The target object property key to mapped
     * @param {Object} config - The component configuration
     */
    constructor(parent,object,key,config){
        validateType(object,key,Boolean);

        config = validateOption(config,DefaultConfig);
        config.label = config.label == null ? key : config.label;

        super(parent,object,key,{
            label : config.label,
            annotation:config.annotation,
            onChange : config.onChange,
            template
        });

        //elements
        this._element.classList.add('type-input');
        this._elementInput = this._element.querySelector('input');
        this._elementInput.addEventListener('input',()=>{
            this.value = this._elementInput.checked;
        });

        //init
        this.sync();
    }

    /**
     * Returns the type name.
     * @return {string}
     */
    static get typeName(){
        return 'boolean';
    }

    /**
     * Forces the component to sync with its underlying property e.g. in case it
     * got changed externally.
     */
    sync(){
        this._elementInput.checked = this.value;
    }
}