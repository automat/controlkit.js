import Component from './Component';
import createHtml from '../util/createHtml';
import validateOption from 'validate-option';

const template =
    `<div class="input-wrap">
        <button></button>
     </div>`;

export const DefaultConfig = Object.freeze({
    label : 'none',
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
            label:config.label
        });

        this._state.name = name;

        this._element.classList.add('type-input');
        this._element.appendChild(createHtml(template));
        this._elementButton = this._element.querySelector('button');

        this.name = this._state.name;

        //listener
        this._elementButton.addEventListener('click',config.onChange.bind(this));
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