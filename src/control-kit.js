import validateOption from 'validate-option';
import validateType from './util/validate-type';
import createHtml from './util/create-html';
import createStyle from './util/create-style';
import createObjectPartial from './util/create-object-partial';

import Reference from './reference';
import Style from './style';
import Panel, {
    DefaultConfig as PanelDefaultConfig,
    AlignmentH as PanelAlignmentH,
    AlignmentV as PanelAlignmentV
} from './group/panel';
import ComponentOptions from './component/component-options';
import ColorPicker from './component/color-picker';

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
    stateLoadSave : false,
    shortcutCharHide : 'h',
    useExternalStyle : true
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

        // state
        this._enabled = config.enabled;
        this._opacity = config.opacity;
        this._stateSaveLoad = config.stateLoadSave;
        this._shortcutCharHide = config.shortcutCharHide;
        this._panels = [];
        this._reference = new Reference();

        // style
        if(!config.useExternalStyle){
            const head = document.head || document.querySelector('head');
            const style = createStyle(Style);
            head.appendChild(style);
        }

        // element
        this._element = (config.element || document.body).appendChild(createHtml(template));

        // listeners
        const onResize = ()=>{
            this.updatePanelAutoPosition();
        };
        const onKeyPress = (e)=>{
            if(e.key !== this._shortcutCharHide.toUpperCase() || !e.ctrlKey || !e.shiftKey){
                return;
            }
            this.enable = !this.enable;
        };
        window.addEventListener('resize',onResize);
        document.addEventListener('keypress',onKeyPress);

        this._removeEventListeners = ()=>{
            window.removeEventListener('resize',onResize);
            document.removeEventListener('keypress',onKeyPress);
        };

        // init options
        const options = ComponentOptions.sharedOptions();
        this._element.appendChild(options.element);

        // init picker
        const picker = ColorPicker.sharedPicker();
        this._element.appendChild(picker.element);
        picker.x = window.innerWidth * 0.5 - picker.width * 0.5;
        picker.y = window.innerHeight * 0.5 - picker.height * 0.5;

        // init
        this.stateLoadSave = this._stateSaveLoad;
    }

    /**
     * Completely removes all panels and components.
     */
    destroy(){
        for(const panel of this._panels){
            panel.destroy();
        }
        this._panels = [];
    };

    /*----------------------------------------------------------------------------------------------------------------*/
    // Sync
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Syncs all component values.
     */
    sync(){
        for(const panel of this._panels){
            panel.sync();
        }
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Query Elements
    /*----------------------------------------------------------------------------------------------------------------*/

    setRef(id,obj){
        this._reference.set(id,obj);
    }

    /**
     * Returns group or component by id.
     * @param id_or_ids
     * @return {Array}
     */
    get(id_or_ids){
        return this._reference.get(id_or_ids);
    }

    /**
     * Returns the underlying root HTMLElement.
     * @return {HTMLElement}
     */
    get element(){
        return this._element;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Modifiers
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Returns ths last active panel.
     * @return {Panel}
     * @private
     */
    _backPanelValid(){
        if(this._panels.length === 0){
            this.add({});
        }
        return this._panels[this._panels.length - 1];
    }

    /**
     * Adds a
     * @param config
     */
    add(config){
        if(config.tyoe){
            return this._backPanelValid().add(config);
        }
        // extract groups & components
        const groups = config.groups;
        const comps = config.comps;
        config = createObjectPartial(config,['groups','comps']);

        // create new panel
        const panel = new Panel(this,config);
        this._panels.push(panel);
        this.updatePanelAutoPosition();

        // create panel groups
        if(groups){
            for(const group of groups){
                panel.add(group);
            }
        }

        // create panel comps
        if(comps){
            for(const comp of comps){
                panel.add(comp);
            }
        }

        return panel;
    }

    /* LEGACY MODIFIERS */

    addPanel(){
        return this.add({});
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Positioning
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Updates auto layout panels position.
     */
    updatePanelAutoPosition(){
        const ptl = [0,0];
        const ptr = [0,0];
        const pbl = [0,0];
        const pbr = [0,0];
        const ptls = [0,0];
        const ptrs = [0,0];
        const pbls = [0,0];
        const pbrs = [0,0];

        for(const panel of this._panels){
            if(panel.fixed){
                continue;
            }

            let pt, pts, pb, pbs, side, sideop;

            // left aligned
            if(panel.alignh === PanelAlignmentH.LEFT){
                pt = ptl;
                pts = ptls;
                pb = pbl;
                pbs = pbls;
                side = 'left';
                sideop = 'right';
            }
            // right aligned
            else {
                pt = ptr;
                pts = ptrs;
                pb = pbr;
                pbs = pbrs;
                side = 'right';
                sideop = 'left';
            }

            const style = panel.element.style;

            switch(panel.alignv){
                // bottom stack
                case PanelAlignmentV.BOTTOM_STACK:
                    style[side] = pbs[0] + 'px';
                    style[sideop] = null;
                    style.top = null;
                    style.bottom  = pbs[1] + 'px';
                    pb[0] += pb[0] === 0 ? panel.width : 0;
                    pbs[1] += panel.height;
                    break;
                // bottom
                case PanelAlignmentV.BOTTOM:
                    style[side] = pb[0] + 'px';
                    style[sideop] = null;
                    style.top = null;
                    style.bottom = pb[1] + 'px';
                    pb[0] += panel.width;
                    pbs[0] += pbs[0] === 0 ? panel.width : 0;
                    break;
                // top stack
                case PanelAlignmentV.TOP_STACK:
                    style[side] = pts[0] + 'px';
                    style[sideop] = null;
                    style.top = pts[1] + 'px';
                    style.bottom = null;
                    pt[0] += pt[0] === 0 ? panel.width : 0;
                    pts[1] += panel.height;
                    break;
                // top
                case PanelAlignmentV.TOP:
                default:
                    style[side] = pt[0] + 'px';
                    style[sideop] = null;
                    style.top = pt[1] + 'px';
                    style.bottom = null;
                    pt[0] += panel.width;
                    pts[0] += pts[0] === 0 ? panel.width : 0;
                    break;
            }
        }
    }

    _removeEventListeners(){}

    /**
     * If false all control kit panels are hidden.
     * @param value
     */
    set enable(value){
        this._enabled = value;
        for(const panel of this._panels){
            panel.enable = value;
        }
    }

    /**
     * Returns true if control kit is enabled.
     * @return {*}
     */
    get enable(){
        return this._enabled;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Config
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Saves the current component state.
     */
    saveConfig(){}

    /**
     * Loads component states from external object.
     */
    loadConfig(state){}

    /**
     * If true state load and save functionality is enabled.
     * @param {Boolean} enable
     */
    set stateLoadSave(enable){
        this._stateSaveLoad = enable;
        if(this._stateLoadSave){
            this._element.classList.remove('state-load-save-disabled');
        } else {
            this._element.classList.add('state-load-save-disabled');
        }
    }

    /**
     * Returns true if state load and save functionality is enabled.
     * @return {Boolean}
     */
    get stateLoadSave(){
        return this._stateSaveLoad;
    }

    /**
     * Saves the current control kit layout configuration.
     */
    saveLayout(){};

    /**
     * Loads an external control kit layout configuration.
     */
    loadLayout(){};
}