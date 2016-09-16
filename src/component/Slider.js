import validateOption from 'validate-option';
import validateType from '../util/validateType';
import createHtml from '../util/createHtml';

import ObjectComponent from './ObjectComponent';

const template =
    `<div class="slider">
        <div class="slider-track">
            <div class="slider-handle"></div>
        </div>
     </div>`;

const templateNumber =
    `<div class="slider-wrap-number">
        <div class="wrap-slider">
            <div class="slider">
                <div class="slider-track">
                    <div class="slider-handle"></div>
                </div>
            </div>
        </div>
        <input type="number" value="1">
     </div>`;

export const DefaultConfig = Object.freeze({
    label : null,
    labelRatio : null,
    range : [0,1],
    numberInput : true,
    onChange : function(){},
    annotation : null
});

function normalize(a,start,end){
    return (a - start) / (end - start);
}

export default class Slider extends ObjectComponent{
    constructor(parent,object,key,config){
        validateType(object,key,Number);

        config = validateOption(config,DefaultConfig);
        config.label = config.label == null ? key : config.label;

        super(parent,object,key,{
            label : config.label,
            labelRatio : config.labelRatio,
            annotation : config.annotation,
            onChange : config.onChange
        });

        //state
        this._state.range = config.range;
        this._state.numberInput = config.numberInput;
        this._state.dragging = false;

        //elements
        this._element.classList.add('type-input');
        this._elementWrap.appendChild(createHtml(this._state.numberInput ? templateNumber : template));
        this._elementTrack = this._element.querySelector('.slider-track');
        this._elementHandle = this._element.querySelector('.slider-handle');
        this._elementInput = this._element.querySelector('input');

        //listeners
        const setValue = (pageX)=>{
            const rect = this._elementTrack.getBoundingClientRect();
            const width = rect.width;
            const value = Math.max(0,Math.min(pageX - rect.left,width)) / width;
            this.value = this.min + value * (this.max - this.min);
            this.sync();
        };
        const onMouseDown = (e)=>{
            this._state.dragging = true;
            setValue(e.pageX);
        };
        const onMouseMove = (e)=>{
            if(!this._state.dragging){
                return;
            }
            setValue(e.pageX);
        };
        const onMouseUp = (e)=>{
            if(!this._state.dragging){
                return;
            }
            this._state.dragging = false;
            setValue(e.pageX);
        };

        this._elementWrap.addEventListener('mousedown',onMouseDown);
        document.addEventListener('mousemove',onMouseMove);
        document.addEventListener('mouseup',onMouseUp);

        this._removeEventListeners = function(){
            document.removeEventListener('mousemove',onMouseMove);
            document.removeEventListener('mouseup',onMouseUp);
        };

        //init
        this.sync();
    }

    get min(){
        return this._state.range[0];
    }

    get max(){
        return this._state.range[1];
    }

    /**
     * Forces the component to sync with its underlying property e.g. in case it
     * got changed externally.
     */
    sync(){
        const width = +this._elementTrack.offsetWidth;
        const value = normalize(this.value,this.min,this.max);
        this._elementHandle.style.right = (1.0 - value) * width + 'px';
    }

}