import validateConfig from 'validate-option';
import deepequal from 'deep-equal';
import validateType from '../util/validate-type';
import createHtml from '../util/create-html';
import {normalize,map,clamp} from '../util/MathUtils';

import ObjectComponent from './ObjectComponent';

const noop = ()=>{};

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<div class="input-background">
        <svg class="svg-pad" version="1.2">
            <path class="axes"></path>
            <path class="handle-axes"></path>
            <path class="handle-shadow" fill-rule="evenodd"></path>
            <path class="handle" fill-rule="evenodd"></path>
        </svg>
    </div>`;

export const DefaultConfig = Object.freeze({
    label : null,
    labelRatio : null,
    rangeX : [-1,1],
    rangeY : [-1,1],
    onChange : noop,
    annotation : null
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Pad
/*--------------------------------------------------------------------------------------------------------------------*/

export default class Pad extends ObjectComponent{
    constructor(parent,object,key,config){
        validateType(object,key,Array);
        if(object[key].length < 2){
            throw new Error('Invalid input length. Must be 2 at least.')
        }
        for(let i = 0; i < 2; ++i){
            validateType(object[key][i],Number);
        }

        config = validateConfig(config,DefaultConfig);

        super(parent,object,key,{
            label : config.label,
            labelRatio : config.labelRatio,
            annotation : config.annotation,
            onChange : config.onChange
        });

        //state
        this._state.rangeX = config.rangeX;
        this._state.rangeY = config.rangeY;

        //elements
        this._element.classList.add('grow');
        this._elementWrap.appendChild(createHtml(template));
        this._elementSvg = this._elementWrap.querySelector('svg');

        //listener input
        let rect = null;
        const setPosition = (e)=>{
            const x = Math.max(0,Math.min(e.pageX - rect.left,rect.width));
            const y = Math.max(0,Math.min(e.pageY - rect.top,rect.height));
            //map
            const rangeX = this._state.rangeX;
            const rangeY = this._state.rangeY;
            //apply
            this.value = [
                map(x,0,rect.width,rangeX[0],rangeX[1]),
                map(y,0,rect.height,rangeY[1],rangeY[0])
            ];
            this.sync();
        };
        let dragging = false;
        this._elementSvg.addEventListener('mousedown',(e)=>{
            rect = this._elementSvg.getBoundingClientRect();
            setPosition(e);
            dragging = true;
        });
        const onDocumentMouseMove = (e)=>{
            if(!dragging){
                return;
            }
            setPosition(e);
        };
        const onDocumentMouseUp = (e)=>{
            if(!dragging){
                return;
            }
            setPosition(e);
            dragging = false;
        };
        document.addEventListener('mousemove',onDocumentMouseMove);
        document.addEventListener('mouseup',onDocumentMouseUp);

        //svg-elements
        this._axes = this._elementSvg.querySelector('.axes');
        this._handleAxes = this._elementSvg.querySelector('.handle-axes');
        this._handleShadow = this._elementSvg.querySelector('.handle-shadow');
        this._handle = this._elementSvg.querySelector('.handle');

        //init
        const resize = ()=>{
            const size = this._elementSvg.getBoundingClientRect().width;
            this._elementSvg.setAttribute('viewbox',`0 0 ${size} ${size}`);
            this._elementSvg.setAttribute('width',size);
            this._elementSvg.setAttribute('height',size);
            //redraw
            this.sync();
        };
        parent.on('scroll-size-change',resize);

        this.range = [this._state.rangeX,this._state.rangeY];
        resize();
    }

    /**
     * Sets the x and y-range.
     * @param {[]} value
     */
    set range(value){
        validateType(value,Array);
        const x = value[0];
        const y = value[1];
        validateType(x,Array);
        validateType(y,Array);
        for(const item of x){
            validateType(item,Number);
        }
        for(const item of y){
            validateType(item,Number);
        }
        const differs = !deepequal(x,this._state.rangeX) || !deepequal(y,this._state.rangeY);
        this._state.rangeX = x.slice(0);
        this._state.rangeY = y.slice(0);
        if(!differs){
            return;
        }
        const minx = this._state.rangeX[0];
        const maxx = this._state.rangeX[1];
        const miny = this._state.rangeY[0];
        const maxy = this._state.rangeY[1];

        //constrain
        const valueX = this.value[0];
        const valueY = this.value[1];
        this.value = [
            Math.max(minx,Math.max(valueX,maxx)),
            Math.max(miny,Math.max(valueY,maxy))
        ];
        this.sync();
    }

    /**
     * Returns the x and y-range set.
     * @return {[]}
     */
    get range(){
        return [this._state.rangeX.slice(0),this._state.rangeY.slice(0)];
    }

    sync(){
        const rect = this._elementSvg.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const value = this.value;
        const rangeX = this._state.rangeX;
        const rangeY = this._state.rangeY;

        //range
        const xmin = rangeX[0];
        const xmax = rangeX[1];
        const ymin = rangeY[0];
        const ymax = rangeY[1];

        //relative axes position
        const oxr = -xmin / (xmax - xmin);
        const oyr = 1.0 - (-ymin / (ymax - ymin));
        const axx = Math.max(1,Math.min(width * oxr,width - 1));
        const ayy = Math.max(1,Math.min(height * oyr,height - 1));

        //value mapped
        const xn = clamp(normalize(value[0],xmin,xmax),0,1);
        const yn = 1.0 - clamp(normalize(value[1],ymin,ymax),0,1);
        const x = xn * rect.width;
        const y = yn * rect.height;

        //plot
        const r0 = 6;
        const d0 = r0 * 2;
        const r1 = r0 - 2;
        const d1 = r1 * 2;
        const sy = 2;

        this._axes.setAttribute('d',
            `M ${axx} ${0} L ${axx} ${height} 
             M ${0} ${ayy} L ${width} ${ayy}`
        );
        this._handleAxes.setAttribute('d',
            `M ${0} ${y} L ${x - r0} ${y} M ${x + r0} ${y} L ${width} ${y}
             M ${x} ${0} L ${x} ${y-r0} M ${x} ${y+r0} L ${x} ${height}`
        );
        this._handleShadow.setAttribute('d',
            `M ${x-r0},${y + sy}a${r0},${r0} 0 1,0 ${d0},0a${r0},${r0} 0 1,0 -${d0},0
             M ${x-r1},${y + sy}a${r1},${r1} 0 1,0 ${d1},0a${r1},${r1} 0 1,0 -${d1},0`
        );
        this._handle.setAttribute('d',
            `M ${x-r0},${y}a${r0},${r0} 0 1,0 ${d0},0a${r0},${r0} 0 1,0 -${d0},0
             M ${x-r1},${y}a${r1},${r1} 0 1,0 ${d1},0a${r1},${r1} 0 1,0 -${d1},0`
        );
    }

    clear(){
        this._removeEventListeners();
    }
}