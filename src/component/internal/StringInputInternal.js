import validateOption from 'validate-option';
import validateType from '../../util/validate-type';
import createHtml from '../../util/create-html';
import EventEmitter from 'events';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const templateSingle = '<input type="text">';
const templateMulti = '<textarea></textarea>';

export const DefaultConfig = Object.freeze({
    readonly : false,
    multiline : false,
    lines : 1,
    resize : false,
    placeholder : null
});

const noop = ()=>{};

/*--------------------------------------------------------------------------------------------------------------------*/
// Number Input Internal
/*--------------------------------------------------------------------------------------------------------------------*/

export default class StringInputInternal extends EventEmitter{
    constructor(config){
        config = validateOption(config,DefaultConfig);
        super();
        this.setMaxListeners(0);

        this._value = '';
        this._readonly = config.readonly;
        this._multiline = config.multiline;
        this._lines = config.lines || 1;
        this._resize = config.resize;
        this._placeholder = config.placeholder;

        //element
        this._element = createHtml(this._multiline ? templateMulti : templateSingle);
        this._element.addEventListener('input',()=>{
            if(this._readonly){
                return;
            }
            this._value = this._element.value;
            this.emit('input');
        });
        this._element.addEventListener('change',()=>{
            this._value = this._element.value;
            this.emit('change');
        });

        //vertical resize event
        if(this._multiline){
            let height = null;
            this._element.addEventListener('mousedown',()=>{
                height = this._element.offsetHeight;
            });
            const onMouseMove = ()=>{
                if(height == null){
                    return;
                }
                if(this._element.offsetHeight == height){
                    return;
                }
                this.emit('size-change');
                height = this._element.offsetHeight;
            };
            const onMouseUp = ()=>{
                if(height == null || this._element.offsetHeight == height){
                    return;
                }
                height = null;
                this.emit('size-change');
            };
            document.addEventListener('mouseup',onMouseUp);
            document.addEventListener('mousemove',onMouseMove);

            this._removeEventListeners = ()=>{
                document.removeEventListener('mouseup',onMouseUp);
                document.removeEventListener('mousemove',onMouseMove);
            }
        } else {
            this._removeEventListeners = noop;
        }

        this.value = this._value;
        this.readonly = this._readonly;
        this.lines = this._lines;
        this.resize = this._resize;
        this.placeholder = this._placeholder;
    }

    /**
     * Sets the input value.
     * @param {string} value
     */
    set value(value){
        this._value = value;
        this._element.value = value;
    }

    /**
     * Returns the input current value.
     * @return {string}
     */
    get value(){
        return this._element.value;
    }

    /**
     * Sets a placeholder string. If null no placeholder is used.
     * @param {string|null} value
     */
    set placeholder(value){
        this._placeholder = value;
        if(!value){
            this._element.removeAttribute('placeholder');
            return;
        }
        this._element.setAttribute('placeholder',value);
    }

    /**
     * Returns the placeholder set. Returns null if no placeholder set.
     * @return {string|null}
     */
    get placeholder(){
        return this._placeholder;
    }

    /**
     * Returns true if multiline display is enabled.
     * @return {boolean}
     */
    get multiline(){
        return this._multiline;
    }

    /**
     * Sets the number of lines displayed. Lines default to 1 of multiline is false.
     * @param {number} value
     */
    set lines(value){
        if(!this._multiline){
            this._lines = 1;
            return;
        }
        validateType(value,Number);
        this._lines = value;
        this._element.rows = value;
    }

    /**
     * Returns the number of lines displayed. Returns 1 if multiline is false.
     * @return {number}
     */
    get lines(){
        return this._lines;
    }

    /**
     * If true the input is read-only.
     * @param {boolean} value
     */
    set readonly(value){
        validateType(value,Boolean);
        this._element.classList[value ? 'add' : 'remove']('readonly');
        this._element.readOnly = value;
        this._readonly = value;
    }

    /**
     * Returns true if the input is read-only.
     * @return {boolean}
     */
    get readonly(){
        return this._readonly;
    }

    /**
     * Returns the underlying HTMLElement.
     * @return {HTMLElement}
     */
    get element(){
        return this._element;
    }

    clear(){
        this._removeEventListeners();
    }
}