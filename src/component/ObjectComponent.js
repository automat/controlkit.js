import validateOption from 'validate-option';
import Component from  './Component';
import createPropProxy from '../util/createPropProxy';

const noop = function(){};

export const DefaultConfig = Object.freeze({
    label : 'none',
    annotation : null,
    onChange : noop
});

export default class ObjectComponent extends Component{
    /**
     * @constructor
     * @param {SubGroup} parent - The parent sub-group
     * @param {Object} object - The target object
     * @param {String} key - The target object property key to mapped
     * @param {Object} config - The component configuration
     */
    constructor(parent,object,key,config){
        config = validateOption(config,DefaultConfig);
        super(parent,{
            label : config.label,
            annotation : config.annotation
        });

        //callbacks
        this._onChange = config.onChange;
        this._onChangeObject = noop;

        //proxy
        this._proxy = createPropProxy(object,key);

        //proxy callbacks
        const onActionChange = (e)=>{
            this._onChange.bind(this)();
            if(e.handle == this._proxy.handle){
                return;
            }
            this.sync();
        };
        const onActionChangeObject = ()=>{
            this._onChangeObject.bind(this)();
        };
        this._removeEventListeners = ()=>{
            this._proxy.removeEventListener(`${key}-change`,onActionChange);
            this._proxy.removeEventListener(`object-change`,onActionChangeObject);
        };

        this._proxy.on(`${key}-change`,onActionChange);
        this._proxy.on('object-change',onActionChangeObject);
    }

    _removeEventListeners(){}

    /**
     * Sets the connected properties value and updates the component accordingly.
     * @param value
     */
    set value(value){
        this._proxy.value = value;
    }

    /**
     * Returns the current property value.
     * @returns {*}
     */
    get value(){
        return this._proxy.value;
    }

    /**
     * Forces the component to sync with its underlying property e.g. in case it
     * got changed externally.
     */
    sync(){};

    /**
     * Completely clears the component and removes it from its parent element.
     */
    clear(){
        this._removeEventListeners();
        super.clear();
    }
}