import createHtml from '../util/createHtml';
import validateOption from 'validate-option';

import ObjectComponent from './ObjectComponent';
import ComponentPreset from './ComponentPreset';


const templateSingle =
    `<div class="input-wrap">
        <input type="text">
     </div>`;

const templateMulti =
    `<div class="input-wrap">
        <textarea></textarea>
     </div>`

export const DefaultConfig = Object.freeze({
    label : null,
    readonly : false,
    multiline : false,
    maxLines : 2,
    preset: null,
    onChange : function(){},
    annotation : null
});

export default class String_ extends ObjectComponent{
    constructor(parent,object,key,config){
        config = validateOption(config,DefaultConfig);
        config.label = config.label == null ? key : config.label;

        super(parent,object,key,{
            label : config.label,
            annotation : config.annotation,
            onChange : config.onChange
        });

        //state
        this._state.readonly = config.readonly;
        this._state.multiline = config.multiline;
        this._state.preset = config.preset;

        //elements
        this._element.classList.add('type-input');
        this._element.appendChild(createHtml(templateSingle));
        this._elementWrap = this._element.querySelector('.input-wrap');
        this._elementInput = this._element.querySelector('input');

        //preset selection
        this._preset = new ComponentPreset(this._elementInput);
        this._preset.on('change',(option)=>{
            this.value = option;
        });

        //init
        this.preset = this._state.preset;
        this.readonly = this._state.readonly;
        this.multiline = this._state.multiline;
        this.maxLines = this._state.maxLines;
        this.sync();
    }

    /**
     * Sets the available presets to be used.
     * @param {Number[]|null} value
     */
    set preset(value){
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
     * Enables / disables multiline text.
     * @param {boolean} value
     */
    set multiline(value){
        this._elementWrap.removeChild(this._elementInput);
        if(value){
            this._elementInput = document.createElement('textarea');
        } else {
            this._elementInput = document.createElement('input');
            this._elementInput.setAttribute('type','text');
        }
        this._elementWrap.appendChild(this._elementInput);

        this._elementInput.addEventListener('input',()=>{
            if(this._state.readonly){
                return;
            }
            this.value = this._elementInput.value;
        })
    }

    /**
     * Returns true if multiline text is enabled
     * @returns {boolean}
     */
    get multiline(){
        return this._state.multiline;
    }

    /**
     * Sets tex maximum number of lines within a multiline string component.
     * @param {number} value
     */
    set maxLines(value){
        this._state.maxLines = value;
        // if(!this._state.multiline){
        //     return;
        // }
        //calc text area height
    }

    /**
     * Returns the number of lines set.
     * @returns {number}
     */
    get maxLines(){
        return this._state.maxLines;
    }

    /**
     * Enables / disables component write ability.
     * @param value
     */
    set readonly(value){
        this._elementInput.classList[value ? 'add' : 'remove']('readonly');
        this._elementInput.readOnly = value;
        this._preset.enable = value;
        this._state.readonly = value;
    }

    /**
     * Return true if the component is readonly.
     * @returns {*}
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