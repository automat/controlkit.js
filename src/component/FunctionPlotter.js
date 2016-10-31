import validateOption from 'validate-option';
import validateType from '../util/validate-type';
import ObjectComponent from './ObjectComponent';
import {normalize,map} from '../util/math-utils';
import {attachMouseListenersDocumentExtended} from '../util/listener-utils';

const noop = ()=>{};

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<div class="input-background">
        <svg version="1.2" class="svg-function-plotter">
            <g transform="translate(0.5,0.5)">
                <path class="axes"></path>
                <path class="function-graph"></path>
            </g>
        </svg>
    </div>`;

/**
 * Function plotter component default config.
 * @type {Object}
 * @property {string} label - The component label
 */
export const DefaultConfig = Object.freeze({
    label : null,
    rangeX : [-1,1],
    rangeY : [-1,1],
    steps : 300,
    useFill: true,
    fill: null,
    stroke: null
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Function Plotter
/*--------------------------------------------------------------------------------------------------------------------*/

export default class FunctionPlotter extends ObjectComponent{
    constructor(parent,object,key,config){
        validateType(object,key,Function);
        config = validateOption(config,DefaultConfig);

        super(parent,object,key,{
            label : config.label,
            template
        });

        this._state.padding = config.padding;
        this._state.rangeX = config.rangeX;
        this._state.rangeY = config.rangeY;
        this._state.steps = config.steps;
        this._state.useFill = config.useFill;
        this._state.offset = [0,0];

        this._elementSvg = this._element.querySelector('svg');
        this._group = this._elementSvg.querySelector('g');
        this._axes = this._group.querySelector('.axes');
        this._graph = this._group.querySelector('.function-graph');
        this._graph.style.stroke = this._state.stroke || null;
        this._graph.style.fill = this._state.useFill ? null : 'none';

        let offsetDown = [0,0];
        let offsetUp = [0,0];
        this._removeEventListeners = attachMouseListenersDocumentExtended(this._elementSvg,{
            onMouseDown : (e)=>{
                offsetDown[0] = e.x / e.rect.width;
                offsetDown[1] = e.y / e.rect.height;
            },
            onMouseDrag : (e)=>{
                //const rect = e.rect;
                const ox = e.x / e.rect.width - offsetDown[0];
                const oy = e.y / e.rect.height - offsetDown[1];
                // const oxn = ox / rect.width;
                // const oyn = oy / rect.height;

                const rangeX = this._state.rangeX;
                const rangeY = this._state.rangeY;
                const spanX = Math.abs(rangeX[0] - rangeX[1]);
                const spanY = Math.abs(rangeY[0] - rangeY[1]);
                const oxs = ox * spanX;
                const oys = oy * spanY;

                this._state.offset[0] = offsetUp[0] + oxs;
                this._state.offset[1] = offsetUp[1] + oys;

                console.log(this._state.offset[0]);

                this.sync();
            },
            onMouseUp : (e)=>{
                offsetUp[0] = this._state.offset[0];
                offsetUp[1] = this._state.offset[1];
            }
        });

        const resize = ()=>{
            this._elementSvg.style.width = null;
            const size = this._elementSvg.getBoundingClientRect().width;
            this._setSize(size,size);
            this.sync();
        };
        parent.on('scroll-size-change',resize);
        resize();
    }

    static typeName(){
        return 'function-plotter';
    }

    _setSize(width,height){
        this._elementSvg.style.width = width + 'px';
        this._elementSvg.style.height = height + 'px';
        this._elementSvg.setAttribute('viewbox',`0 0 ${width} ${height}`);
    }

    sync(){
        const rect = this._elementSvg.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const func = this.value;

        const steps = this._state.steps;
        const rangeX = this._state.rangeX;
        const rangeY = this._state.rangeY;

        //range
        const xmin = rangeX[0];
        const xmax = rangeX[1];
        const ymin = rangeY[0];
        const ymax = rangeY[1];

        //offset drag
        const offsetX = this._state.offset[0];
        const offsetY = this._state.offset[1];

        //relative axes position
        const oxr = -xmin / (xmax - xmin);
        const oyr = 1.0 - (-ymin / (ymax - ymin));
        const axx = Math.max(1,Math.min(width * oxr + offsetX,width - 1));
        const ayy = Math.max(1,Math.min(height * oyr,height - 1));

        //y over x
        const points = [];
        for(let i = 0; i < steps; ++i){
            const n = i / (steps - 1);
            const x = xmin + n * (xmax - xmin);
            const y = 1.0 - normalize(func(x - offsetX),ymin,ymax);
            const ax = n * width;
            const ay = y * height;
            points.push(ax,ay);
        }

        if(this._state.useFill){
            points.unshift(points[0],height);
            points.push(points[points.length-2],height);
        }

        let path = `M ${points[0]} ${points[1]} `;
        for(let i = 2; i < points.length; i+=2){
            path += `L ${points[i]} ${points[i+1]} `;
        }

        this._axes.setAttribute('d',
            `M ${axx} ${0} L ${axx} ${height} 
             M ${0} ${ayy} L ${width} ${ayy}`
        );
        this._graph.setAttribute('d',path);
    }

    clear(){
        this._removeEventListeners();
    }
}