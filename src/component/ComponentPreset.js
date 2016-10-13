import EventEmitter from 'events';
import createHtml from '../util/create-html';
import ComponentOptions from './ComponentOptions';

const templatePresetWrap = `<div class="input-wrap-preset"></div>`;
const templatePresetButton = `<button class="btn-preset"></button>`;

export default class ComponentPreset extends EventEmitter{
    constructor(input){
        super();
        this.setMaxListeners(0);

        this._options = null;

        //elements
        this._parent = input.parentNode;
        this._input = input;
        this._elementWrap = createHtml(templatePresetWrap);
        this._elementButton = createHtml(templatePresetButton);

        //listener
        const options = ComponentOptions.sharedOptions();
        this._elementButton.addEventListener('click',()=>{
            options.dock(this._input);
            options.options = this._options;
            options.enable = true;
            // this._elementButton.classList.add()
        });
        options.on('change',(info)=>{
            if(info.input !== this._input){
                return;
            }
            this.emit('change',info.value);
        });
    }

    set options(value){
        if(value){
            this._parent.removeChild(this._input);
            this._parent.appendChild(this._elementWrap);
            this._parent.appendChild(this._elementButton);
            this._elementWrap.appendChild(this._input);
            this._options = value.slice(0);
        } else {
            if(this._parent.contains(this._elementWrap)){
                this._parent.removeChild(this._elementWrap);
                this._parent.removeChild(this._elementButton);
                this._parent.appendChild(this._input);
            }
            this._options = null;
        }
    }

    get options(){
        return this._options ? this._options.slice(0) : null;
    }
}