import EventEmitter from 'events';
import createHtml from '../util/create-html';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template
/*--------------------------------------------------------------------------------------------------------------------*/

const template = '<ul class="component-options"></ul>';

/*--------------------------------------------------------------------------------------------------------------------*/
// Component options
/*--------------------------------------------------------------------------------------------------------------------*/

export default class ComponentOptions extends EventEmitter{
    constructor(){
        if(ComponentOptions.__shared){
            throw new Error('ComponentOptions already initialized.');
        }
        super();
        this.setMaxListeners(0);

        this._target = null;
        this._enabled = false;
        this._options = null;

        this._element = createHtml(template);
        this._element.addEventListener('mousedown',()=>{
            this.enable = false;
        })
    }

    /**
     * Sets the target element the option list get attached to.
     * @param {HTMLElement} element
     */
    set target(element){
        this._target = element;
        const bounds = element.getBoundingClientRect();
        this._element.style.minWidth = bounds.width + 'px';
        this._element.style.left = bounds.left + 'px';
        this._element.style.top = bounds.bottom - 1 + 'px';
    }

    /**
     * Returns the current target.
     * @return {HTMLElement}
     */
    get target(){
        return this._target;
    }

    /**
     * Sets the options to select from.
     * @param {null|*} value
     */
    set options(value){
        //remove prev elements
        while(this._element.firstChild){
            this._element.removeChild(this._element.firstChild);
        }
        //hide
        if(!value){
            this._options = null;
            this.enable = false;
            return;
        }
        this._options = value;
        //create items
        for(let i = 0; i < value.length; ++i){
            const item = value[i];
            const li = this._element.appendChild(document.createElement('li'));

            //number / string
            if(item instanceof Number || typeof item === 'number' ||
               item instanceof String || typeof item === 'string'){
                li.classList.add('primitive');
                li.textContent = item;
            }
            //color
            else if(false) {

            }
            //image
            else if(false) {

            }
            //video
            else if(false){

            }
            //not supported
            else {

            }
            //listener
            li.addEventListener('mousedown',()=>{
                this.emit('change',this._target,item,i);
                this.enable = false;
            });
        }
        //show
        this.enable = true;
    }

    /**
     * Returns the options to select from.
     * @return {null|*}
     */
    get options(){
        return this._options;
    }

    /**
     * If true the option list is shown.
     * @param {boolean} value
     */
    set enable(value){
        this._enabled = value;
        this._element.classList[value ? 'remove' : 'add']('hide');
    };

    /**
     * Returns true if enabled
     * @return {boolean}
     */
    get enable(){
        return this._enabled;
    }

    /**
     * Trigger from target and value.
     * @param target
     * @param options
     */
    trigger(target,options){
        if(this.enable && this.target === target){
            this.enable = false;
            return;
        }
        this.target = target;
        this.options = options;
    }

    /**
     * Returns the underlying HTMLElement.
     * @return {HTMLElement}
     */
    get element(){
        return this._element;
    }

    /**
     * Returns the shared option list.
     * @return {null|ComponentOptions}
     */
    static sharedOptions(){
        if(!ComponentOptions.__shared){
            ComponentOptions.__shared = new ComponentOptions();
        }
        return ComponentOptions.__shared;
    }

    /**
     * Removes the shared option list.
     */
    static clearSharedOptions(){
        if(!ComponentOptions.__shared){
            throw new Error('Component options no initialised.');
        }
        ComponentOptions.__shared = null;
    }
}

ComponentOptions.__shared = null;