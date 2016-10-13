import EventEmitter from 'events';
import createHtml from '../util/create-html';

const template = '<ul class="component-options"></ul>';

export default class ComponentOptions extends EventEmitter{
    constructor(){
        if(ComponentOptions.__shared){
            throw new Error('ComponentOptions already initialized.');
        }
        super();
        this.setMaxListeners(0);

        this._enabled = false;
        this._element = createHtml(template);
        this._element.addEventListener('mousedown',()=>{
            this.enable = false;
        })
    }

    dock(element){
        const bounds = element.getBoundingClientRect();
    }

    set options(value){
        while(this._element.firstChild){
            this._element.removeChild(this._element.firstChild);
        }
        if(!value){
            return;
        }
        for(const item in value){
            const li = document.createElement('li');
            li.innerText = item;
            this._element.addEventListener('mousedown',()=>{

            });
        }
    }

    set enable(value){
        this._enabled = value;
        this._element.classList[value ? 'remove' : 'add']('hide');
    };

    get enable(){
        return this._enabled;
    }

    get element(){
        return this._element;
    }

    static sharedOptions(){
        if(!ComponentOptions.__shared){
            ComponentOptions.__shared = new ComponentOptions();
        }
        return ComponentOptions.__shared;
    }
}

ComponentOptions.__shared = null;