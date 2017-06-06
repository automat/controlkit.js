import validateOption from 'validate-option';
import validateType from '../../util/validate-type';
import createHtml from '../../util/create-html';
import EventEmitter from 'events';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

/**
 * Number inut default config
 * @type {Object}
 * @property {boolean} readonly - If true, the input is readonly
 * @property {number} min - Value min value
 * @property {number} max - Value max value
 * @property {number} fd - Number fo fractional digits displayed.
 * @property {number} step - The amount stepped when pressing up/down keys.
 * @property {number} stepShiftMult - The amount the stepping value gets multiplied with when holding shift while stepping.
 */
export const DefaultConfig = Object.freeze({
    element : null,
    readonly : false,
    min : null,
    max : null,
    fd : 4,
    step: 0.25,
    stepShiftMult : 2
});

function formatValue(x,min,max,fd){
    x = +x;
    if(min != null && max != null){
        x = Number.isNaN(x) ? min : Math.max(min,Math.min(x,max));
    } else if(min != null){
        x = Number.isNaN(x) ? min : Math.max(min,x);
    } else if(max != null){
        x = Number.isNaN(x) ? max : Math.min(x,max);
    } else {
        x = Number.isNaN(x) ? 0 : x;
    }
    x = fd !== null ? x.toFixed(fd) : x;
    return x;
}

/*--------------------------------------------------------------------------------------------------------------------*/
// Number Input Internal
/*--------------------------------------------------------------------------------------------------------------------*/

/**
 * Internal number input
 * @class
 */
export default class NumberInputInternal extends EventEmitter{
    /**
     * @constructor
     * @param config
     */
    constructor(config){
        config = validateOption(config,DefaultConfig);

        super();
        this.setMaxListeners(0);

        this._readonly = config.readonly;
        this._min = config.min;
        this._max = config.max;
        this._fd = config.fd;
        this._step = config.step || 0;
        this._stepShiftMult = config.stepShiftMult || 1;
        this._value = 0;

        this._element = null;
        if(config.element){
            if(!(config.element instanceof HTMLInputElement)){
                throw new Error('Element passed not instance of HTMLInputElement.');
            } else if(config.element.type !== 'number'){
                throw new Error('Element passed not of type "number".');
            }
            this._element = config.element;
        } else {
            this._element = createHtml('<input type="number">');
        }

        const formatInputValue = (x)=>{
            this._value = this._element.value = formatValue(x,this._min,this._max,this._fd);
        };

        this._element.addEventListener('input',()=>{
            if(this._readonly){
                return;
            }
            this._value = formatValue(this._element.valueAsNumber,this._min,this._max,this._fd);
            this.emit('input')
        });
        //format on enter
        this._element.addEventListener('change',()=>{
            formatInputValue(this._element.valueAsNumber);
            this.emit('change');
        });
        //format on step
        this._element.addEventListener('keydown',(e)=>{
            if(this._readonly){
                return;
            }
            let step = this._step;
            if(step){
                step *= e.shiftKey ? (this._stepShiftMult || 1) : 1;
                if(e.code == 'ArrowUp' || e.code == 'ArrowDown'){
                    step *= e.code == 'ArrowUp' ? 1 : -1;
                    formatInputValue(this._element.valueAsNumber + step);
                    this.emit('step');
                    this.emit('input');
                    e.preventDefault();
                }
            } else {
                //prevent stepping
                switch(e.code){
                    case 'ArrowUp':
                    case 'ArrowDown':
                        e.preventDefault();
                        break;
                }
            }
        });
        //prevent mousewheel stepping
        const onMouseWheel = (e)=>{e.preventDefault();};
        this._element.addEventListener('mousewheel',onMouseWheel);
        this._element.addEventListener('wheel',onMouseWheel);

        this.value = this._value;
        this.readonly = this._readonly;
        this.step = this._step;
        this.min = this._min;
        this.max = this._max;
    }

    /**
     * Returns the underlying HTMLElement.
     * @return {HTMLElement}
     */
    get element(){
        return this._element;
    }

    /**
     * Returns the input current value.
     * @return {number}
     */
    get value(){
        return this._value
    }

    /**
     * Sets the input value.
     * @param {number} x
     */
    set value(x){
        this._element.value = formatValue(x,this._min,this._max,this._fd);
        this._value = this._element.valueAsNumber;
    }

    /**
     * Sets the min value. If null constraining the inputs value to a lower bound gets deactivated.
     * @param {null|number} x
     */
    set min(x){
        this._min = x;
        if(x == null){
            this._element.removeAttribute('min');
            return;
        }
        validateType(x,Number);
        this._element.setAttribute('min',x);
        this.value = this._value;
    }

    /**
     * Returns the min value set. Returns null if deactivated.
     * @return {null|number}
     */
    get min(){
        return this._min;
    }

    /**
     * Sets the amount to step the value while pressing arrow up / down key.
     * If null stepping gets deactivated.
     * @param {number|null} x
     */
    set step(x){
        this._step = x;
        if(x == null){
            this._element.removeAttribute('step');
            return;
        }
        validateType(x,Number);
        this._element.setAttribute('step',x);
    }

    /**
     * Returns the stepping value. If null no stepping is deactivated.
     * @return {number|null}
     */
    get step(){
        return this._step;
    }

    /**
     * Sets the multiplier for value stepping while holding shift key.
     * If null step multiplication gets deactivated.
     * @param {number|null} x
     */
    set stepShiftMult(x){
        this._stepShiftMult = x;
        if(x == null){
            return;
        }
        validateType(x,Number);
    }

    /**
     * Returns the stepping multiplier. Returns null if deactivated.
     * @return {number|null}
     */
    get stepShiftMult(){
        return this._stepShiftMult;
    }

    /**
     * Sets the max value. If null constraining the inputs value to an upper bound gets deactivated;
     * @param {null|number} x
     */
    set max(x){
        this._max = x;
        if(x == null){
            this._element.removeAttribute('max');
            return;
        }
        validateType(x,Number);
        this._element.setAttribute('max',x);
        this.value = this._value;
    }

    /**
     * Returns the max value set. Returns null if deactivated.
     * @return {null|number}
     */
    get max(){
        return this._max;
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

}