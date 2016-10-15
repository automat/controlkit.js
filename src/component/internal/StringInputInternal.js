import validateOption from 'validate-option';
import validateType from '../../util/validate-type';
import createHtml from '../../util/create-html';
import EventEmitter from 'events';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const templateSingle = '<input type="text">';
const templateMulti = '<textarea></textarea>';

/**
 * Default config
 * @type {Object}
 * @property {boolean} readonly - If true the input is readonly.
 * @property {boolean} multiline - If true multiple lines can be displayed.
 * @property {number} lines - The number of lines to be displayed. (multiline must be enabled)
 * @property {boolean} fitToContent - If true the input automatically vertically grows to its content. (multiline must be enabled)
 * @property {null|number} maxHeight - The maximum height for multiline input.
 * @property {null|string} placeholder - A placeholder value to be used.
 */
export const DefaultConfig = Object.freeze({
    readonly : false,
    multiline : false,
    lines : 1,
    fitToContent : false,
    maxHeight : null,
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
        this._fitToContent = config.fitToContent;
        this._maxHeight = config.maxHeight;
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
            this._updateHeight();
        });
        this._element.addEventListener('change',()=>{
            this._value = this._element.value;
            this.emit('change');
            this._updateHeight();
        });

        //vertical resize event
        if(this._multiline){
            let height = null;
            //FIXME: Safari does not register ANY events on the resize handler
            this._element.addEventListener('mousedown',()=>{
                height = this._element.offsetHeight;
            });
            const onMouseMove = ()=>{
                if(height == null){
                    return;
                }
                const offsetHeight = this._element.offsetHeight;
                if(offsetHeight == height){
                    return;
                }
                height = offsetHeight;
                //constrain
                if(this._maxHeight && height > this._maxHeight){
                    height = this._maxHeight;
                    this._element.style.height = height + 'px';
                }
                this.emit('size-change');
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
        this.fitToContent = this._fitToContent;
        this.resize = this._resize;
        this.placeholder = this._placeholder;
    }

    /**
     * Updates the input height to its content.
     * @private
     */
    _updateHeight(){
        if(!this._fitToContent){
            return;
        }
        //reset height set
        this._element.style.height = null;
        const height = this._element.offsetHeight;
        const heightScroll = this._element.scrollHeight;
        if(height == heightScroll){
            return;
        }
        this._element.style.height = Math.max(heightScroll,this._maxHeight || 0) + 'px';
        this.emit('size-change');
    }

    /**
     * Constrains the input to a max height set.
     * @private
     */
    _constrainHeight(){
        if(!this._maxHeight){
            return;
        }
        const offsetHeight = this._element.offsetHeight;
        if(offsetHeight == this._maxHeight){
            return;
        }
        this._element.style.height = offsetHeight < this._maxHeight ?
                                     null : (this._maxHeight + 'px');
        this.emit('size-change');
    }

    /**
     * Sets the input value.
     * @param {string} value
     */
    set value(value){
        this._value = value;
        this._element.value = value;
        this._constrainHeight();
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
        this._updateHeight();
        this._constrainHeight();
    }

    /**
     * Returns the number of lines displayed. Returns 1 if multiline is false.
     * @return {number}
     */
    get lines(){
        return this._lines;
    }

    /**
     * If true the multiline input automatically adjusts to its content vertically.
     * @param {boolean} value
     */
    set fitToContent(value){
        if(!this._multiline){
            this._grow = false;
            return;
        }
        validateType(value,Boolean);
        this._fitToContent = value;
        this._updateHeight();
    }

    /**
     * Returns true if the multiline input automatically adjusts to its content vertically.
     * @return {boolean}
     */
    get fitToContent(){
        return this._fitToContent;
    }

    /**
     * Sets the maximum height for multiline input. If null no max height gets applied.
     * @param {number|null} value
     */
    set maxHeight(value){
        if(!this._multiline){
            this._maxHeight = null;
            return;
        }
        this._maxHeight = value;
        this._updateHeight();
        this._constrainHeight();
    }

    /**
     * Returns the max height set for multiline inputs. Returns null if no max height set.
     * @return {number|null}
     */
    get maxHeight(){
        return this._maxHeight;
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
     * Returns the current inputs height.
     * @return {number}
     */
    get height(){
        return this._element.offsetHeight;
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