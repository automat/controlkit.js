var CanvasRenderer = require('./renderer/CanvasRenderer/CanvasRenderer');
var DomRenderer    = require('./renderer/DomRenderer/DomRenderer');
var WebGLRenderer  = require('./renderer/WebGLRenderer/WebGLRenderer');

var Mouse = require('../input/Mouse');

var cssParse = require('css-parse');

var RENDERER_CANVAS = 'ControlKitRendererCanvas';
var RENDERER_DOM    = 'ControlKitRendererDom';
var RENDERER_WEBGL  = 'ControlKitRendererWebGL';

function ControlKit(element,renderer,options){
    options = {};

    this._renderer = null;

    var cssString = '';

    if(options.externalStyle !== undefined){
        cssString = cssParse(options.externalStyle);
    }

    var cssRules = cssParse(cssString);

    this._mouse = Mouse.init();

    /*----------------------------------------------------------------------------------------------------------------*/
    // Style
    /*----------------------------------------------------------------------------------------------------------------*/
    var self = this;

    switch (renderer){

        /*------------------------------------------------------------------------------------------------------------*/
        // Renderer Canvas
        /*------------------------------------------------------------------------------------------------------------*/
        case RENDERER_CANVAS:
            this._renderer = new CanvasRenderer(element,cssRules);

            element.addEventListener('mousedown',function(e){
                self._mouse.handleMouseDown(e);
            });

            element.addEventListener('mousemove',function(e){
                self._mouse.handleMouseMove(e);
            });

            element.addEventListener('mouseup', function(e){
                self._mouse.handleMouseUp(e);
            });

            if(window !== undefined){
                window.addEventListener('resize', function(e){
                    self._renderer.handleResize({
                        width  : window.innerWidth,
                        height : window.innerHeight
                    });
                });
            }

            break;

        /*------------------------------------------------------------------------------------------------------------*/
        // Renderer Dom
        /*------------------------------------------------------------------------------------------------------------*/
        case RENDERER_DOM:
            break;

        /*------------------------------------------------------------------------------------------------------------*/
        // Renderer WebGL
        /*------------------------------------------------------------------------------------------------------------*/

        case RENDERER_WEBGL:
            break;
    }
}

ControlKit.RENDERER_CANVAS = RENDERER_CANVAS;
ControlKit.RENDERER_DOM    = RENDERER_DOM;
ControlKit.RENDERER_WEBGL  = RENDERER_WEBGL;

module.exports = ControlKit;
