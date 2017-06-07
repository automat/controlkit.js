import validateOption from 'validate-option';
import validateType from '../util/validate-type';

import StringInputInternal from './internal/StringInputInternal';
import ObjectComponent from './ObjectComponent';
import ComponentPreset from './ComponentPreset';

/*--------------------------------------------------------------------------------------------------------------------*/
// Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const noop = ()=>{};

/**
 * Default config
 * @type {Object}
 */
export const DefaultConfig = Object.freeze({
    id : null,
    label : null,
    readonly : false,
    multiline : false,
    lines : 1,
    fitToContent : false,
    maxHeight : null,
    resize : false,
    placeholder : null,
    preset: null,
    onChange : noop,
    annotation : null
});

/*--------------------------------------------------------------------------------------------------------------------*/
// String
/*--------------------------------------------------------------------------------------------------------------------*/

export default class String_ extends ObjectComponent{
    constructor(parent,object,key,config){
        validateType(object,key,String);
        validateOption(config,DefaultConfig);

        config = validateOption(config,DefaultConfig);
        config.label = config.label == null ? key : config.label;

        super(parent,object,key,{
            id : config.id,
            label : config.label,
            annotation : config.annotation,
            onChange : config.onChange
        });

        //state
        this._state.preset = config.preset;

        //input
        this._input = new StringInputInternal({
            readonly : config.readonly,
            multiline : config.multiline,
            lines : config.lines,
            fitToContent : config.fitToContent,
            maxHeight : config.maxHeight,
            resize : config.resize,
            placeholder : config.placeholder
        });

        //elements
        this._element.classList.add('type-input');
        this._elementWrap.appendChild(this._input.element);

        //height update
        if(this._input.multiline){
            const computedStyle = window.getComputedStyle(this._element);
            const paddingTop = parseInt(computedStyle.paddingTop);
            const paddingBottom = parseInt(computedStyle.paddingBottom);
            const offset = 1.5; //FIXME: Non-manual offset set.

            const updateHeight = ()=>{
                const height = paddingTop + this._input.height + paddingBottom + offset;
                this._element.style.height = height + 'px';
            };
            this._input.on('size-change',updateHeight);
            updateHeight();
        }

        //preset
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
        return 'string';
    }

    /**
     * Sets the available presets to be used.
     * @param {string[]|null} value
     */
    set preset(value){
        if(value != null){
            validateType(value,Array);
        }
        this._preset.options = this._state.preset = value || null;
    }

    /**
     * Returns the current presets.
     * @returns {string[]|null}
     */
    get preset(){
        return this._preset ? this._preset.slice(0) : null;
    }

    /**
     * Sets a placeholder string. If null no placeholder is used.
     * @param {string|null} value
     */
    set placeholder(value){
        this._input.placeholder = value;
    }

    /**
     * Returns the placeholder set. Returns null if no placeholder set.
     * @return {string|null}
     */
    get placeholder(){
        return this._input.placeholder;
    }

    /**
     * Returns true if multiline display is enabled.
     * @return {boolean}
     */
    get multiline(){
        return this._input.multiline;
    }

    /**
     * Sets the number of lines displayed. Lines default to 1 of multiline is false.
     * @param {number} value
     */
    set lines(value){
        this._input.lines = value;
    }

    /**
     * Returns the number of lines displayed. Returns 1 if multiline is false.
     * @return {number}
     */
    get lines(){
        return this._input.lines;
    }

    /**
     * If true the multiline input automatically adjusts to its content vertically.
     * @param {boolean} value
     */
    set fitToContent(value){
        this._input.fitToContent = value;
    }

    /**
     * Returns true if the multiline input automatically adjusts to its content vertically.
     * @return {boolean}
     */
    get fitToContent(){
        return this._input.fitToContent;
    }

    /**
     * Sets the maximum height for multiline input. If null no max height gets applied.
     * @param {number|null} value
     */
    set maxHeight(value){
        this._input.maxHeight = value;
    }

    /**
     * Returns the max height set for multiline inputs. Returns null if no max height set.
     * @return {number|null}
     */
    get maxHeight(){
        return this._input.maxHeight;
    }

    /**
     * If true the input is read-only.
     * @param {boolean} value
     */
    set readonly(value){
        this._input.readonly = value;
    }

    /**
     * Returns true if the input is read-only.
     * @return {boolean}
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
    }

    destroy(){
        this._input.destroy();
        super.destroy();
    }
}