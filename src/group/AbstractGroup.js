import validateOption from 'validate-option';
import EventEmitter from 'events';

const DefaultConfig = Object.freeze({
    label  : null,
    enable : true,
    height : null
});

export default class AbstractGroup extends EventEmitter{
    constructor(parent,config){
        config = validateOption(config,DefaultConfig);
        super();

        this._state = {
            label  : config.label,
            enable : config.enable,
            height : config.height
        };

        this._parent  = parent;
        this._element = null;
        this._elementHead = null;
        this._elementLabel = null;
        this._elementList = null;
    }

    set label(value){
        this._state.label = value;
        if(value === null || value === 'none' || value === ''){
            this._elementLabel.innerText = '';
            this._elementHead.classList.add('hide');
            return;
        }
        this._elementLabel.innerText = value;
        this._elementHead.classList.remove('hide');
    }

    get label(){
        return this._state.label;
    }

    set enable(value){
        this._state.enable = value;
        this._element.classList[value ? 'remove' : 'add']('collapse');
        this.emit('size-change');
    }

    get enable(){
        return this._state.enable;
    }

    get maxHeight(){
        return this._state.height;
    }

    get element(){
        return this._element;
    }

    get parent(){
        return this._parent;
    }

    clear(){
        this._element.parentNode.removeChild(this._element);
    }
}