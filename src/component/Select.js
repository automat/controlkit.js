import ObjectComponent from '../component/ObjectComponent';
import validateType from '../util/validate-type';
import validateOption from 'validate-option';
import createPropProxy from '../util/create-prop-proxy';
import ComponentOptions from './ComponentOptions';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template = '<button class="btn-select"></button>';

const noop = ()=>{};

/**
 * Select default config
 * @type {Object}
 */
export const DefaultConfig = Object.freeze({
    id : null,
    label : 'select',
    onChange : noop,
    onSelect : noop,
    indexSelected : 0,
    target : null,
    annotation : null
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Select
/*--------------------------------------------------------------------------------------------------------------------*/

export default class Select extends ObjectComponent{
    /**
     * @constructor
     * @param parent
     * @param object
     * @param key
     * @param config
     */
    constructor(parent,object,key,config){
        validateType(object,key,Array);

        config = validateOption(config,DefaultConfig);
        config.label = config.label === null ? key : config.label;

        if(config.target){
            if(config.target.object === undefined){
                throw new Error('Target object missing "object" key.');
            }
            if(config.target.key === undefined){
                throw new Error('Target object missing "key" key.');
            }
            validateType(config.target.object,Object);
            validateType(config.target.key,String);
        }

        super(parent,object,key,{
            id : config.id,
            label:config.label,
            onChange: config.onChange,
            annotation:config.annotation,
            template
        });

        //state
        this._state.target = config.target ? createPropProxy(config.target.object,config.target.key) : null;
        this._state.indexSelected = this._state.target ? this.value.indexOf(this._state.target.value) : -1;

        //elements
        this._element.classList.add('type-input');
        this._elementButton = this._element.querySelector('button');
        this._elementButton.textContent = this.value[0];

        //options
        const options = ComponentOptions.sharedOptions();
        const onSelect = config.onSelect.bind(this);
        options.on('change',(target,value,index)=>{
            if(target !== this._elementButton || index == this._state.indexSelected){
                return;
            }
            this._state.indexSelected = index;
            this.sync();
            onSelect(this.valueSelected,this.indexSelected);
        });
        this._elementButton.addEventListener('click',()=>{
            options.trigger(this._elementButton,this.value,this.valueSelected);
        });
    }

    /**
     * Returns the type name.
     * @return {string}
     */
    static get typeName(){
        return 'select';
    }

    /**
     * Sets the current option index selected, set -1 if nothing should be selected.
     * @param {number} index
     */
    set indexSelected(index){
        validateType(index,Number);
        this._state.indexSelected = Math.max(-1,Math.min(index,this.value.length-1));
    }

    /**
     * Returns the current option index selected, returns -1 if nothing selected.
     * @return {number}
     */
    get indexSelected(){
        return this._state.indexSelected;
    }

    /**
     * Returns the current value selected, returns null if nothing selected.
     * @return {*}
     */
    get valueSelected(){
        const index = this._state.indexSelected;
        if(index == -1){
            return null;
        }
        return this.value[index];
    }

    /**
     * Sets a selection target.
     * @param object
     * @param key
     */
    setTarget(object,key){
        if(object == null){
            if(this._state.target){
                this._state.target = null;
            }
            return;
        }
        validateType(object,Object);
        validateType(object,String);
        const target = this._state.target;
        if(target && (target.object == object && target.key == key)){
            return;
        }
        this._state.target = createPropProxy(object,key);
        this.sync();
    }

    sync(){
        const value = this.valueSelected;
        if(!value){
            this._elementButton.textContent = 'Select ...';
        } else {
            this._elementButton.textContent = value;
            if(this._state.target){
                this._state.target.value = value;
            }
        }
    }
}