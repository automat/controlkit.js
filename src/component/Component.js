import validateOption from 'validate-option';
import createHtml from '../util/create-html';
import validateType from '../util/validate-type';
import EventEmitter from 'events';
import Reference from '../reference';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<li class="component">
        <label></label>
        <div class="input-wrap">
        </div>
     </li>`;

export const DefaultConfig = Object.freeze({
    id : null,
    label : 'none',
    labelRatio : null,
    annotation : null,
    template : null,
    hide : false
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Component
/*--------------------------------------------------------------------------------------------------------------------*/

export default class Component extends EventEmitter{
    /**
     * @constructor
     * @param {SubGroup} parent - The parent sub-group
     * @param {*} config - The component configuration
     */
    constructor(parent,config){
        config = validateOption(config,DefaultConfig);

        super();
        this.setMaxListeners(0);

        // this._state = {
        //     id : config.id,
        //     label : config.label,
        //     labelRatio : config.labelRatio,
        //     annotation : config.annotation,
        //     hide : config.hide
        // };

        // state
        this._id = config.id;
        this._label = config.label;
        this._labelRatio = config.labelRatio;
        this._annotation = config.annotation;
        this._hide = config.hide;

        // node
        this._parent = parent;
        this._element = this._parent.elementList.appendChild(createHtml(template));
        this._elementLabel = this._element.querySelector('label');
        this._elementWrap = this._element.querySelector('.input-wrap');
        if(config.template){
            validateType(config.template,String);
            this._elementWrap.appendChild(createHtml(config.template));
        }

        // state initial
        this.id = this._id;
        this.label = this._label;
        this.labelRatio = this._labelRatio;
        if(this._annotation){
            this.setAnnotation(this._annotation.title,this._annotation.text);
        }
    };

    /**
     * Sets the components id.
     * @param {string|null} value
     */
    set id(value){
        if(!value){
            if(this._id && Reference.has(this._id)){
                Reference.delete(this._id);
                this._id = null;
            }
            return;
        }
        validateType(value,String);
        Reference.set(value,this);
        this._id = value;
    }

    /**
     * Returns the components id.
     * @return {string|null}
     */
    get id(){
        return this._id;
    }

    /**
     * If true the component is hidden.
     * @param {Boolean} hide
     */
    set hide(hide){
        if(hide === this._hide){
            return;
        }
        this._hide = hide;
        this._element.classList.toggle('hide');
        this._parent.updateHeight();
    }

    /**
     * Returns true if the component is hidden.
     * @return {Boolean}
     */
    get hide(){
        return this._hide;
    }

    /**
     * Sets the component label. If the value passed is 'none' the label gets
     * removed.
     * @param {String|null} value
     */
    set label(value){
        this._label = value;
        if(value === 'none'){
            this._elementLabel.innerText = '';
            this._element.classList.add('hide-label');
            return;
        }
        this._elementLabel.innerText = value === null ? '' : value;
        this._element.classList.remove('hide-label');
    }

    /**
     * Returns the current label.
     * @returns {*}
     */
    get label(){
        return this._label;
    }

    /**
     * Sets the label / input width ratio.
     * @param {Number} value
     */
    set labelRatio(value){
        this._labelRatio = value;
        if(value === null){
            this._elementLabel.style.width = null;
            this._elementWrap.style.width = null;
        } else{
            const style = this.computedStyle;
            const paddingLeft = parseFloat(style.paddingLeft);
            const paddingRight = parseFloat(style.paddingRight);
            const width = parseFloat(style.width) - paddingLeft - paddingRight;
            this._elementLabel.style.width = width * value - (paddingLeft + paddingRight) * 0.25 + 'px';
            this._elementWrap.style.width = width * (1.0 - value) + 'px';
        }
    }

    /**
     * Returns the label / input width ratio.
     * @returns {Number}
     */
    get labelRatio(){
        return this._labelRatio;
    }

    /**
     * Returns the underlying dom element.
     * @returns {HTMLElement}
     */
    get element(){
        return this._element;
    }

    /**
     * Returns the components parent group.
     * @returns {SubGroup}
     */
    get parent(){
        return this._parent;
    }

    /**
     * Sets a annotation to be displayed on hover.
     * @param {String} title_or_null - The title of the info annotation.
     * @param {String} text - The annotation body text.
     */
    setAnnotation(title_or_null,text){
        if(!title_or_null){


            return;
        }
        validateType(title_or_null,String);
        validateType(text,String);
        this._annotation  = this._annotation || {};
        this._annotation.title = title_or_null;
        this._annotation.text = text;
    }

    /**
     * Returns a copy of the annotation set.
     * @returns {*}
     */
    getAnnotation(){
        if(!this._annotation){
            return null;
        }
        return Object.assign({},this._annotation);
    }

    get computedStyle(){
        return window.getComputedStyle(this._element);
    }

    /**
     * Completely clears the component and removes it from its parent element.
     */
    destroy(){
        this._parent._removeComponent(this);
    }
}