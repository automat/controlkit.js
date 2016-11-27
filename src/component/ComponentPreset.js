import EventEmitter from 'events';
import createHtml from '../util/create-html';
import ComponentOptions from './ComponentOptions';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template
/*--------------------------------------------------------------------------------------------------------------------*/

const templatePresetWrap = `<div class="input-wrap-preset"></div>`;
const templatePresetButton = `<button class="btn-preset"></button>`;

/*--------------------------------------------------------------------------------------------------------------------*/
// Component preset
/*--------------------------------------------------------------------------------------------------------------------*/

export default class ComponentPreset extends EventEmitter{
    constructor(input){
        super();
        this.setMaxListeners(0);

        //options ref
        this._options = null;

        //elements
        this._parent = input.parentNode;
        this._input = input;
        this._elementWrap = createHtml(templatePresetWrap);
        this._elementButton = createHtml(templatePresetButton);

        //options
        const options = ComponentOptions.sharedOptions();
        options.on('change',(target,value)=>{
            if(target !== this._input){
                return;
            }
            this.emit('change',value);
        });
        this._elementButton.addEventListener('click',()=>{
            options.trigger(this._input,this._options);
        });
    }

    /**
     * Sets a list of preset option. If null the preset toggle get removed.
     * @param value
     */
    set options(value){
        //add
        if(value){
            if(!(value instanceof Array)){
                throw new Error('Options not of type "Array".');
            }
            this._parent.removeChild(this._input);
            this._parent.appendChild(this._elementWrap);
            this._parent.appendChild(this._elementButton);
            this._elementWrap.appendChild(this._input);
            this._options = value.slice(0);
        }
        //remove
        else {
            if(this._parent.contains(this._elementWrap)){
                this._parent.removeChild(this._elementWrap);
                this._parent.removeChild(this._elementButton);
                this._parent.appendChild(this._input);
            }
            this._options = null;
        }
    }

    /**
     * Returns the optons set
     * @return {*}
     */
    get options(){
        return this._options ? this._options.slice(0) : null;
    }
}