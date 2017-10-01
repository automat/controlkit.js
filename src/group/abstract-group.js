import validateOption from 'validate-option';
import EventEmitter from 'events';
import validateType from '../util/validate-type';
import Reference from '../reference';
import ScrollContainer from './scroll-container';

/*--------------------------------------------------------------------------------------------------------------------*/
// Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

/**
 * Default AbstractGroup config
 * @type {Object}
 * @param {string|null} config.id
 * @param {string|null} config.label
 * @param {number|null} config.labelRatio
 * @param {boolean} config.enable
 * @param {number|null} config.height
 */
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
     * @param {object} [config]
     * @param {string|null} [config.id]
     * @param {string|null} [config.label]
     * @param {number|null} [config.labelRatio]
     * @param {boolean} [config.enable]
     * @param {number|null} [config.height]
     */
    constructor(parent,config){
        config = validateOption(config,DefaultConfig);

        super();
        this.setMaxListeners(0);

        // state
        this._id = config.id;
        this._label = config.label;
        this._labelRatio = config.labelRatio;
        this._enable = config.enable;
        this._height = 0;
        this._maxHeight = config.height;

        // node
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

        this.id = this._id;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Query
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Sets the groups id.
     * @param {string|null} value
     */
    set id(value){
        if(!value){
            if(this._id && Reference.has(this._id)){
                Reference.delete(this._id);
                this._id = null;
            }
            return;
        }
        validateType(value,String);
        Reference.set(value,this);
        this._id = value;
    }

    /**
     * Returns the groups id.
     * @return {string|null}
     */
    get id(){
        return this._id;
    }

    /**
     * Returns the parent element.
     * @returns {AbstractGroup|Panel}
     */
    get parent(){
        return this._parent;
    }

    /**
     * Returns the control kit root instance.
     */
    get root(){}

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
        this._label = value;
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
        return this._label;
    }

    /**
     * Sets the groups global label / component width ratio.
     * @param value
     */
    set componentLabelRatio(value){
        this._labelRatio = value;
    }

    /**
     * Returns the groups global label / component width ratio.
     * @returns {*}
     */
    get componentLabelRatio(){
        return this._labelRatio;
    }

    /**
     * Enables / disables the group.
     * @param {Boolean} value
     */
    set enable(value){
        this._enable = value;
        this._element.classList[value ? 'remove' : 'add']('collapse');
        this.updateHeight();
        this.emit('size-change');
    }

    /**
     * Returns true if enabled.
     * @returns {Boolean}
     */
    get enable(){
        return this._enable;
    }

    /**
     * Returns the groups max height.
     * @returns {Number|null}
     */
    get maxHeight(){
        return this._height;
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

    destroy(){
        this._element.parentNode.removeChild(this._element);
    }
}