import Component from './Component';
import validateOption from 'validate-option';

const template = '<button></button>';

export const DefaultConfig = Object.freeze({
    id : null,
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
            id : config.id,
            label:config.label,
            template
        });

        this._state.name = name;
        this._onChange = config.onChange.bind(this);

        this._element.classList.add('type-input');
        this._elementButton = this._element.querySelector('button');

        this.name = this._state.name;

        //listener
        this._onChange = null;
        this.onChange = config.onChange;
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
     * @param {function}value
     */
    set onChange(value){
        if(value == this._onChange){
            return;
        }
        if(this._onChange){
            this._elementButton.removeEventListener('click',this._onChange);
        }
        this._onChange = value.bind(this);
        this._elementButton.addEventListener('click',this._onChange);
    }

    /**
     * Returns the button press callback.
     * @return {function}
     */
    get onChange(){
        return this._onChange;
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