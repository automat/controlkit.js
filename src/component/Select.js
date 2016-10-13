import ObjectComponent from './ObjectComponent';
import createHtml from '../util/create-html';
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
            annotation:config.annotation
        });

        this._element.classList.add('type-input');
        this._element.appendChild(createHtml(template));
        this._elementButton = this._elementWrap.appendChild(createHtml(template));

    }
    set value(value){
        // super.value = value;
        // this._elementInput.value = value;
    }

    get value(){
        // return super.value;
    }
}