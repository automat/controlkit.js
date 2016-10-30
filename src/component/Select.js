import ObjectComponent from './ObjectComponent';
import validateOption from 'validate-option';

const template = '<button class="btn-select"></button>';

export const DefaultConfig = Object.freeze({
    label : null,
    onChange : function(){},
    annotation : null
});

export default class Select extends ObjectComponent{
    constructor(parent,object,key,config){
        config = validateOption(config,DefaultConfig);
        config.label = config.label === null ? key : config.label;

        super(parent,object,key,{
            label:config.label,
            annotation:config.annotation,
            template
        });

        this._element.classList.add('type-input');
        this._elementButton = this._element.querySelector('button');

    }

    /**
     * Returns the type name.
     * @return {string}
     */
    static get typeName(){
        return 'select';
    }

    set value(value){
        // super.value = value;
        // this._elementInput.value = value;
    }

    get value(){
        // return super.value;
    }
}