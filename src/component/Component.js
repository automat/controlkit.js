import validateOption from 'validate-option';
import createHtml from '../util/createHtml';

const template =
    `<li class="component">
        <label></label>
     </li>`;

export const DefaultConfig = Object.freeze({
    label : 'none',
    annotation : null
});

export default class Component{
    /**
     * @constructor
     * @param {SubGroup} parent - The parent sub-group
     * @param {*} config - The component configuration
     */
    constructor(parent,config){
        config = validateOption(config,DefaultConfig);

        this._state = {
            label : config.label,
            annotation : config.annotation
        };

        this._parent = parent;
        this._element = createHtml(template);
        this._elementLabel = this._element.querySelector('label');

        this.label = this._state.label;
    };

    /**
     * Sets the component label. If the value passed is null the label gets
     * removed.
     * @param {String|null} value
     */
    set label(value){
        this._state.label = value;
        if(value === null){
            this._elementLabel.innerText = '';
            this._element.classList.add('hide-label');
            return;
        }
        this._elementLabel.innerText = value === 'none' ? '' : value;
        this._element.classList.remove('hide-label');
    }

    /**
     * Returns the current label.
     * @returns {*}
     */
    get label(){
        return this._state.label;
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
     * @param {String} title - The title of the info annotation.
     * @param {String} text - The annotation body text.
     */
    setAnnotation(title,text){
        const annotation = this._state.annotation || {};
        annotation.title = title;
        annotation.text = text;
    }

    /**
     * Returns a copy of the annotation set.
     * @returns {*}
     */
    getAnnotation(){
        if(!this._state.annotation){
            return null;
        }
        return Object.assign({},this._state.annotation);
    }

    /**
     * Completely clears the component and removes it from its parent element.
     */
    clear(){
        this._element.parentNode.removeChild(this._element);
    }
}