import validateOption from 'validate-option';
import validateType from './util/validate-type';
import validateDescription from './util/validate-description';
import createHtml from './util/create-html';

import Panel, {DefaultConfig as PanelDefaultConfig} from './group/Panel';
import ComponentOptions from './component/ComponentOptions';
import ColorPicker from './component/ColorPicker';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template = `<section id="control-kit"></section>`;

/**
 * Default Control Kit config
 * @type {Object}
 * @property {Boolean} enabled
 * @property {Number} opacity
 * @property {Boolean} stateSaveLoad
 * @property {String} shortcutCharHide
 */
export const DefaultConfig = Object.freeze({
    element : null,
    enabled : true,
    opacity : 1.0,
    stateSaveLoad : true,
    shortcutCharHide : 'h'
});
/*--------------------------------------------------------------------------------------------------------------------*/
// Control Kit
/*--------------------------------------------------------------------------------------------------------------------*/

export default class ControlKit{
    /**
     * @constructor
     * @param config
     */
    constructor(config){
        config = validateOption(config,DefaultConfig);

        //state
        this._state = {
            enabled : config.enabled,
            opacity: config.opacity,
            stateSaveLoad : config.stateSaveLoad,
            shortcutCharHide: config.shortcutCharHide,
        };

        this._panels = [];

        //element
        this._element = createHtml(template);
        (config.element ? config.element : document.body).appendChild(this._element);

        //listeners
        const onKeyPress = (e)=>{
            if(e.key !== this._state.shortcutCharHide.toUpperCase() || !e.ctrlKey || !e.shiftKey){
                return;
            }
            this.enable = !this.enable;
        };
        document.addEventListener('keypress',onKeyPress);

        this._removeEventListeners = ()=>{
            document.removeEventListener('keypress',onKeyPress);
        };

        //init options
        const options = ComponentOptions.sharedOptions();
        this._element.appendChild(options.element);

        //init picker
        const picker = ColorPicker.sharedPicker();
        this._element.appendChild(picker.element);
        picker.x = window.innerWidth * 0.5 - picker.width * 0.5;
        picker.y = window.innerHeight * 0.5 - picker.height * 0.5;
    }

    _removeEventListeners(){}

    /**
     * Returns ths last active panel.
     * @return {Panel}
     * @private
     */
    _backPanelValid(){
        if(this._panels.length == 0){
            this.addPanel();
        }
        return this._panels[this._panels.length - 1];
    }

    /**
     * Adds a new panel to the control kit.
     * @param config
     * @return {*}
     */
    addPanel(config){
        this._panels.push(new Panel(this,config));
        return this._panels[this._panels.length - 1];
    }

    /**
     * Creates a panel from description.
     * @param description
     * @example
     * //create empty panel
     * controlkit.add({
     *     label: 'panel'
     * });
     * @example
     * //create panel with group
     * controlKit.add({
     *     label : 'panel',
     *     groups : [
     *         {label : 'group a'},
     *         {label : 'group b'}
     *     ]
     * });
     * @example
     * //create panel with groups and sub-groups
     * controlKit.add({
     *     label : 'panel',
     *     groups : [{
     *         label : 'group a',
     *         subGroups : [
     *             {label : 'sub-group a'},
     *             {label : 'sub-group b'}
     *         ]
     *     }]
     * });
     * @example
     * //create panel with groups, sub-groups and components
     * controlKit.add({
     *     label : 'panel',
     *     groups : [{
     *         label : 'group a',
     *         subGroups : [{
     *             label : 'sub-group a',
     *             components : [
     *                 {type:'number',object:obj,key:'property0'},
     *                 {type:'slider',object:obj,key:'property0',range:[0,1]}
     *             ]
     *         }]
     *     }]
     * });
     * @example
     * //create panel with single auto-created group, sub-groups and components
     * controlKit.add({
     *     label : 'panel',
     *     subGroups : [{
     *         label : 'sub-group a',
     *         components : [
     *             {type:'number',object:obj,key:'property0'},
     *             {type:'slider',object:obj,key:'property0',range:[0,1]}
     *         ]
     *     }]
     * });
     * @example
     * //create panel with single auto-created group, sub-groups and components
     * controlKit.add({
     *     label : 'panel',
     *     components : [
     *         {type:'number',object:obj,key:'property0'},
     *         {type:'slider',object:obj,key:'property0',range:[0,1]}
     *     ]
     * });
     * @example
     * //assumptions
     *
     * //creates an empty panel
     * controlKit.add({});
     *
     * //creates two empty panels
     * controlKit.add([
     *     {},
     *     {}
     * ]);
     *
     * //creates a default panel + group with two sub-groups including components
     * controlKit.add([
     *     {label: 'group a', components : [{type:'number',object:obj,key:'propertyA'}]},
     *     {label: 'group a', components : [{type:'number',object:obj,key:'propertyB'}]]},
     * ]);
     *
     * //creates a default panel + group + sub-group structure from an array of components
     * controlKit.add([
     *      {type:'number',object:obj,key:'property0'},
     *      {type:'slider',object:obj,key:'property0',range:[0,1]}
     * ])
     */
    add(description){
        //array of descriptions
        if(description instanceof Array){
            for(const item of description){
                this.add(item);
            }
            return this;
        }
        if(!description.groups){
            throw new Error('Invalid panel description. Groups missing. Use {...,groups:[...]}.')
        }
        validateType(description.groups,Array);
        const config = validateDescription(description,PanelDefaultConfig,['groups']);
        this.addPanel(config);
        this._backPanelValid().add(description.groups);
        return this;
    }

    /**
     * If false all control kit panels are hidden.
     * @param value
     */
    set enable(value){
        this._state.enabled = value;
        for(const panel of this._panels){
            panel.enable = value;
        }
    }

    /**
     * Returns true if control kit is enabled.
     * @return {*}
     */
    get enable(){
        return this._state.enabled;
    }

    /**
     * Returns the underlying root HTMLElement.
     * @return {HTMLElement}
     */
    get element(){
        return this._element;
    }

    /**
     * Syncs all component values.
     */
    sync(){
        for(const panel of this._panels){
            panel.sync();
        }
    }

    /**
     * Saves the current component state.
     */
    saveConfig(){}

    /**
     * Loads component states from external object.
     */
    loadConfig(state){}

    /**
     * Saves the current control kit layout configuration.
     */
    saveLayout(){};

    /**
     * Loads an external control kit layout configuration.
     */
    loadLayout(){};

    /**
     * Completely removes all panels and components.
     */
    clear(){
        for(const panel of this._panels){
            panel.clear();
        }
        this._panels = [];
    };

    getState(){
        const state = Object.assign({},this._state);
        state.panels = this._panels.map((item)=>{return item.getState()});
        return state;
    }
}