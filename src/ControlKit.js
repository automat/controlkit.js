import EventDispatcher from "./core/event/EventDispatcher";
import RendererEvent   from "./renderer/RendererEvent";

import CanvasRenderer from "./renderer/CanvasRenderer/CanvasRenderer";
import validateOption from "validate-option"

const RENDERER_CANVAS = 'renderer-canvas';
const RENDERER_DOM    = 'renderer-dom';
const RENDERER_WEBGL  = 'renderer-webgl';

const EMPTY_FUNC = ()=>{};

const DefaultOptions = {
    renderer : RENDERER_DOM,
    element : null,
    debugDrawLayout : false,
    debugDrawBounds : false,
    debugDrawHover : false
};

class ControlKit extends EventDispatcher{
    constructor(options = {}){
        super();
        options = validateOption(options,DefaultOptions);

        let rendererOptions = {
            debugDrawLayout : options.debugDrawLayout,
            debugDrawBounds : options.debugDrawBounds,
            debugDrawHover  : options.debugDrawHover
        };
        this._renderer = null;
        this._onDraw   = EMPTY_FUNC;

        let self = this;


        switch(options.renderer){
            case RENDERER_CANVAS:
                if(options.element === null){
                    if(window && document && document.createElement){
                        let canvas = document.createElement('canvas');
                        canvas.width  = window.innerWidth || 800;
                        canvas.height = window.innerHeight || 600;
                        canvas.style.width  = canvas.width + 'px';
                        canvas.style.height = canvas.height + 'px';
                        document.body.appendChild(canvas);
                        options.element = canvas;
                    } else{
                        throw new Error(`No canvas element passed.`);
                    }
                }
                this._renderer = new CanvasRenderer(options.element, rendererOptions);
                this._renderer.addEventListener(RendererEvent.DRAW,(e)=>{
                    self._onDraw(e);
                    self.dispatchEvent(e);
                });

                break;

            case RENDERER_DOM:
                break;

            case RENDERER_WEBGL:
                break;

            default:
                throw new Error(`Invalid renderer "${options.renderer}"`);
                break;
        }
    }

    set onDraw(func){
        this._onDraw = (func === null || func === undefined) ? EMPTY_FUNC : func.bind(this);
    }

    get onDraw(){
        return this._onDraw;
    }
}

ControlKit.RENDERER_CANVAS = RENDERER_CANVAS;
ControlKit.RENDERER_DOM = RENDERER_DOM;
ControlKit.RENDERER_WEBGL = RENDERER_WEBGL;

export default ControlKit;
