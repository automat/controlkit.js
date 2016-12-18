import validateOption from 'validate-option';
import Component from  './Component';
import createPropProxy from '../util/create-prop-proxy';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const noop = function(){};

export const DefaultConfig = Object.freeze({
    label : 'none',
    labelRatio : null,
    annotation : null,
    onChange : noop,
    onChangeObject : noop,
    template : null
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Object Component
/*--------------------------------------------------------------------------------------------------------------------*/

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
        config.label = !config.label ? key : config.label;

        super(parent,{
            label : config.label,
            labelRatio : config.labelRatio,
            annotation : config.annotation,
            template : config.template
        });

        //proxy
        this._proxy = createPropProxy(object,key);

        //callbacks
        this._onChange = null;
        this._onChangeObject = null;
        this.onChange = config.onChange;
        this.onChangeObject = config.onChangeObject;
    }

    _removeEventListeners(){
        this._proxy.removeEventListener(`${this.key}-change`,this._onChange);
        this._proxy.removeEventListener(`object-change`,this._onChangeObject);
    }

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
     * Returns a proxy to the connected object.
     * @returns {*}
     */
    get object(){
        return this._proxy;
    }

    /**
     * Returns the property key.
     * @returns {String}
     */
    get key(){
        return this._proxy.key;
    }

    /**
     * Sets the on property value change callback.
     * @param {function} value
     */
    set onChange(value){
        if(value == this._onChange){
            return;
        }
        const event = `${this.key}-change`;
        if(this._onChange){
            this._proxy.removeEventListener(event,this._onChange);
        }
        const onChange = value.bind(this);
        this._onChange = (e)=>{
            onChange(this.value);
            if(e.handle == this._proxy.handle){
                return;
            }
            this.sync();
        };

        this._proxy.on(event,this._onChange);
    }

    /**
     * Returns the on property change callback.
     * @return {function}
     */
    get onChange(){
        return this._onChange;
    }

    /**
     * Sets the on object change callback.
     * @param {function} value
     */
    set onChangeObject(value){
        if(value == this._onChangeObject){
            return;
        }
        const event = `object-change`;
        if(this._onChangeObject){
            this._proxy.removeEventListener(event,this._onChangeObject);
        }
        this._onChangeObject = value.bind(this);
        this._proxy.on(event,this._onChangeObject);
    }

    /**
     * Returns the on object change callback.
     * @return {function}
     */
    get onChangeObject(){
        return this._onChangeObject;
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