import Component from './Component';
import validateOption from 'validate-option';

const template = '<button></button>';

export const DefaultConfig = Object.freeze({
    label : null,
    onChange : function(){}
});

export default class Button extends Component{
    /**
     * @constructor
     * @param parent
     * @param name
     * @param config
     */
    constructor(parent,name,config){
        name = name || 'button';
        config = validateOption(config,DefaultConfig);
        super(parent,{
            label:config.label,
            template
        });

        this._state.name = name;
        this._onChange = config.onChange;

        this._element.classList.add('type-input');
        this._elementButton = this._element.querySelector('button');

        this.name = this._state.name;

        //listener
        this._elementButton.addEventListener('click',()=>{this._onChange.bind(this);});
    }

    /**
     * Returns the type name.
     * @return {string}
     */
    static get typeName(){
        return 'button';
    }

    /**
     * Set the button press callback.
     * @param value
     */
    set onChange(value){
        this._onChange = value;
    }

    /**
     * Sets the name of the button.
     * @param value
     */
    set name(value){
        this._state.name = value;
        this._elementButton.innerText = value;
    }

    /**
     * Returns the button name.
     * @returns {*}
     */
    get name(){
        return this._state.name;
    }
}