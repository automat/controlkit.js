import validateOption from 'validate-option';
import validateType from '../util/validate-type';
import ObjectComponent from './ObjectComponent';
import {normalize} from '../util/math-utils';
import {attachMouseListenersDocumentExtended} from '../util/listener-utils';

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
 * @property {number[]} rangeX - x range
 * @property {number[]} rangeY - y range
 * @property {number} steps - Point render steps
 * @property {boolean} useFill - If true, the graph is closed and filled.
 * @property {string} fill - Graph fill color
 * @property {string} stroke - Graph stroke color
 * @property {number} strokeWidth - Graph stroke width
 * @property {boolean} dragX - If true, graph can be dragged on x-axis.
 * @property {boolean} dragY - If true, graph can be dragged on y-axis.
 * @property {boolean} scaleX - If true, graph can be scaled on x-axis.
 * @property {number} scaleXStep - X-axis scale step.
 */
export const DefaultConfig = Object.freeze({
    label : null,
    rangeX : [-1,1],
    rangeY : [-1,1],
    steps : 300,
    useFill: true,
    fill: null,
    stroke: null,
    strokeWidth : null,
    dragX : true,
    dragY : false,
    scaleX : false,
    scaleXStep : 0.125
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

        //state
        this._state.padding = config.padding;
        this._state.rangeX = config.rangeX;
        this._state.rangeY = config.rangeY;
        this._state.steps = config.steps;
        this._state.useFill = config.useFill;
        this._state.fill = config.fill;
        this._state.stroke = config.stroke;
        this._state.strokeWidth = config.strokeWidth;
        this._state.dragX = config.dragX;
        this._state.dragY = config.dragY;
        this._state.scaleX = config.scaleX;
        this._state.scaleXStep = config.scaleXStep;
        this._state.scaleXSum = 1;
        this._state.offset = [0,0];

        //elements
        this._elementSvg = this._element.querySelector('svg');
        this._group = this._elementSvg.querySelector('g');
        this._axes = this._group.querySelector('.axes');
        this._graph = this._group.querySelector('.function-graph');
        this._graph.style.stroke = this._state.stroke || null;
        this._graph.style.strokeWidth = this._state.strokeWidth || null;
        this._graph.style.fill = this._state.useFill ? null : 'none';

        //mouse drag + zoom
        let down = false;
        let offsetDown = [0,0];
        let offsetUp = [0,0];
        this._removeEventListeners = attachMouseListenersDocumentExtended(this._elementSvg,{
            onMouseDown : (e)=>{
                if(!this._state.dragX && !this._state.dragY){
                    return;
                }
                offsetDown[0] = e.x / e.rect.width;
                offsetDown[1] = e.y / e.rect.height;
                down = true;
            },
            onMouseDrag : (e)=>{
                if(!this._state.dragX && !this._state.dragY){
                    return;
                }
                const ox = e.x / e.rect.width - offsetDown[0];
                const oy = e.y / e.rect.height - offsetDown[1];

                this._state.offset[0] = offsetUp[0] + ox;
                this._state.offset[1] = offsetUp[1] + oy;

                this.sync();
            },
            onMouseWheel : (e)=>{
                if(!this._state.scaleX){
                    return;
                }
                const delta = e.wheelDelta | e.detail;
                const scale = delta < 0 ? -1 : delta > 0 ? 1 : 0;
                this._state.scaleXSum += scale * this._state.scaleXStep;
                this._state.scaleXSum = Math.max(this._state.scaleXStep,this._state.scaleXSum);

                this.sync();

                //prevent container scroll
                e.preventDefault();
                e.stopPropagation();
            },
            onMouseUp : ()=>{
                if(!this._state.dragX && !this._state.dragY){
                    return;
                }
                offsetUp[0] = this._state.offset[0];
                offsetUp[1] = this._state.offset[1];
                down = false;
            }
        });

        //resize
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
        const spanX = Math.abs(xmin - xmax);
        const spanY = Math.abs(ymin - ymax);

        //offset drag
        const scaleX = this._state.scaleXSum;
        const offsetX = this._state.offset[0] * +this._state.dragX;
        const offsetY = this._state.offset[1] * +this._state.dragY;
        const offsetXFunc = offsetX * spanX * scaleX;
        const offsetYFunc = offsetY * spanY;

        //relative axes position
        const oxr = -xmin / (xmax - xmin);
        const oyr = 1.0 - (-ymin / (ymax - ymin));
        const axx = Math.max(1,Math.min(width * (oxr + offsetX),width - 1));
        const ayy = Math.max(1,Math.min(height * (oyr + offsetY),height - 1));

        //y over x
        const points = [];
        for(let i = 0; i < steps; ++i){
            const n = i / (steps - 1);
            const x = xmin + n * (xmax - xmin);
            const y = 1.0 - (normalize(func(x * scaleX - offsetXFunc) - offsetYFunc,ymin,ymax));
            const ax = n * width;
            const ay = y * height;
            points.push(ax,ay);
        }

        //optional close graph
        if(this._state.useFill){
            points.unshift(points[0],height);
            points.push(points[points.length-2],height);
        }

        //create path cmd
        let path = `M ${points[0]} ${points[1]} `;
        for(let i = 2; i < points.length; i+=2){
            path += `L ${points[i]} ${points[i+1]} `;
        }

        //set axes + graph path cmd
        this._axes.setAttribute('d',
            `M ${axx} ${0} L ${axx} ${height} 
             M ${0} ${ayy} L ${width} ${ayy}`
        );
        this._graph.setAttribute('d',path);
    }

    destroy(){
        this._removeEventListeners();
        super.destroy();
    }
}