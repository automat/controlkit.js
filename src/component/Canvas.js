import validateOption from 'validate-option';
import Component from './Component';
import {attachMouseListenersDocumentExtended} from '../util/listener-utils';

const noop = function(){};

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<div class="input-background">
        <canvas></canvas>
    </div>`;

/**
 * Canvas component default config.
 * @type {Object}
 * @property {string} label - The component label
 * @property {function} init - Called on component init, properties can be attached to the component scope.
 * @property {function} draw - Defines a draw function called on component init. Can be called externally.
 * @property {function} onMouseDown - Callback on canvas mouse down
 * @property {function} onMouseMove - Callback on canvas mouse move
 * @property {function} onMouseUp - Callback on canvas mouse up
 * @property {function} onMouseDrag - Callback on canvas mouse drag
 * @property {function} onKeyDown - Callback on key down
 * @property {function} onKeyPress - Callback on key press
 * @property {function} onKeyUp - Callback on key up
 */
export const DefaultConfig = Object.freeze({
    label : 'canvas',
    init : noop,
    draw : noop,
    onMouseDown : noop,
    onMouseMove : noop,
    onMouseUp : noop,
    onMouseDrag : noop,
    onKeyDown : null,
    onKeyPress : null,
    onKeyUp : null
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Canvas
/*--------------------------------------------------------------------------------------------------------------------*/

export default class Canvas extends Component{
    /**
     * @constructor
     * @param parent
     * @param config
     */
    constructor(parent,config){
        config = validateOption(config,DefaultConfig);

        super(parent,{
            label:config.label,
            template
        });

        this._draw = config.draw;

        //elements
        this._elementCanvas = this._element.querySelector('canvas');
        this._elementCanvas.setAttribute('tabindex',1);

        this._ctx = this._elementCanvas.getContext('2d');

        //listeners
        const context = {
            ctx : this._ctx,
            draw : this.draw
        };
        this._removeEventListeners = attachMouseListenersDocumentExtended(
            this._elementCanvas,{
                onMouseDown : config.onMouseDown.bind(this),
                onMouseMove : config.onMouseMove.bind(this),
                onMouseUp   : config.onMouseUp.bind(this),
                onMouseDrag : config.onMouseDrag.bind(this),
                args : [context]
            }
        );
        if(config.onKeyDown){
            this._elementCanvas.addEventListener('keydown',config.onKeyDown.bind(this));
        }
        if(config.onKeyPress){
            this._elementCanvas.addEventListener('keypress',config.onKeyPress.bind(this));
        }
        if(config.onKeyUp){
            this._elementCanvas.addEventListener('keyup',config.onKeyUp.bind(this));
        }

        //init
        this._elementCanvas.height = this._elementCanvas.offsetWidth;
        config.init.bind(this)();

        //init
        const resize = ()=>{
            const size = this._elementCanvas.offsetWidth;
            this._elementCanvas.width = size;
            this._elementCanvas.height = size;
            //redraw
            this.draw();
        };
        parent.on('scroll-size-change',resize);
        resize();
    }

    /**
     * Returns the canvas 2d context.
     * @return {CanvasRenderingContext2D}
     */
    get ctx(){
        return this._ctx;
    }

    /**
     * Returns the underlying HTMLCanvasElement.
     * @return {HTMLCanvasElement}
     */
    get canvas(){
        return this._elementCanvas;
    }

    /**
     * Returns the width of the canvas.
     * @return {Number}
     */
    get width(){
        return this._elementCanvas.width;
    }

    /**
     * Returns the height of the canvas.
     * @return {Number}
     */
    get height(){
        return this._elementCanvas.height;
    }

    /**
     * Calls the draw function passed on init.
     */
    draw(){
        this._draw({ctx:this._ctx});
    }

    /**
     * Completely clears the component and removes it from its parent element.
     */
    clear(){
        this._removeEventListeners();
    }
}