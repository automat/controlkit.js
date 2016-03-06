import CanvasRenderer from "./renderer/CanvasRenderer/CanvasRenderer";
import validateOptions from "./validate-options";

const RENDERER_CANVAS = 'renderer-canvas';
const RENDERER_DOM    = 'renderer-dom';
const RENDERER_WEBGL  = 'renderer-webgl';

const DefaultOptions = {
    renderer : RENDERER_DOM,
    element : null,
    debugDrawLayout : false,
    debugDrawBounds : false,
    debugDrawHover : false
};

class ControlKit{
    constructor(options = {}){
        options = validateOptions(options,DefaultOptions);

        let rendererOptions = {
            debugDrawLayout : options.debugDrawLayout,
            debugDrawBounds : options.debugDrawBounds,
            debugDrawHover  : options.debugDrawHover
        };
        this._renderer = null;

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
}

ControlKit.RENDERER_CANVAS = RENDERER_CANVAS;
ControlKit.RENDERER_DOM = RENDERER_DOM;
ControlKit.RENDERER_WEBGL = RENDERER_WEBGL;

export default ControlKit;
