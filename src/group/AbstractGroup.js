import validateOption from 'validate-option';
import EventEmitter from 'events';
import validateType from '../util/validate-type';
import Reference from '../Reference';
import ScrollContainer from './ScrollContainer';

/*--------------------------------------------------------------------------------------------------------------------*/
// Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const DefaultConfig = Object.freeze({
    id : null,
    label  : null,
    labelRatio : null,
    enable : true,
    height : null
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Abstract Group
/*--------------------------------------------------------------------------------------------------------------------*/

export default class AbstractGroup extends EventEmitter{
    /**
     * @constructor
     * @param parent
     * @param config
     */
    constructor(parent,config){
        config = validateOption(config,DefaultConfig);

        super();
        this.setMaxListeners(0);

        this._state = {
            id : config.id,
            label  : config.label,
            labelRatio : config.labelRatio,
            enable : config.enable,
            height: 0,
            maxHeight : config.height
        };

        this._parent  = parent;
        this._element = null;
        this._elementHead = null;
        this._elementLabel = null;
        this._elementList = null;

        //optional usable scroll container for main child
        this._scrollContainer = new ScrollContainer();

        //bubble up container change
        this._scrollContainer.on('size-change',()=>{
            this.emit('scroll-size-change');
            this.emit('size-change');
        });

        //captured scroll container change parent
        parent.on('scroll-size-change',()=>{
            this.emit('scroll-size-change');
        });

        this.id = this._state.id;
    }

    set id(value){
        if(!value){
            if(this._state.id && Reference.has(this._state.id)){
                Reference.delete(this._state.id);
                this._state.id = null;
            }
            return;
        }
        validateType(value,String);
        Reference.set(value,this);
        this._state.id = value;
    }

    get id(){
        return this._state.id;
    }

    /**
     * Override in sub-class;
     * @private
     */
    updateHeight(){};

    /**
     * Sets the group head label.
     * @param {String|null} value
     */
    set label(value){
        this._state.label = value;
        if(value === null || value === 'none' || value === ''){
            this._elementLabel.innerText = '';
            this._elementHead.classList.add('hide');
            return;
        }
        this._elementLabel.innerText = value;
        this._elementHead.classList.remove('hide');
    }

    /**
     * Returns the group head label.
     * @returns {String|null}
     */
    get label(){
        return this._state.label;
    }

    /**
     * Sets the groups global label / component width ratio.
     * @param value
     */
    set componentLabelRatio(value){
        this._state.labelRatio = value;
    }

    /**
     * Returns the groups global label / component width ratio.
     * @returns {*}
     */
    get componentLabelRatio(){
        return this._state.labelRatio;
    }

    /**
     * Enables / disables the group.
     * @param {Boolean} value
     */
    set enable(value){
        this._state.enable = value;
        this._element.classList[value ? 'remove' : 'add']('collapse');
        this.updateHeight();
        this.emit('size-change');
    }

    /**
     * Returns true if enabled.
     * @returns {Boolean}
     */
    get enable(){
        return this._state.enable;
    }

    /**
     * Returns the groups max height.
     * @returns {Number|null}
     */
    get maxHeight(){
        return this._state.height;
    }

    /**
     * Returns the underlying HTMLElement.
     * @returns {HTMLElement}
     */
    get element(){
        return this._element;
    }

    /**
     * Returns the groups list HTMLElement
     * @returns {HTMLElement}
     */
    get elementList(){
        return this._elementList;
    }

    /**
     * Returns the parent element.
     * @returns {AbstractGroup|Panel}
     */
    get parent(){
        return this._parent;
    }

    destroy(){
        this._element.parentNode.removeChild(this._element);
    }
}