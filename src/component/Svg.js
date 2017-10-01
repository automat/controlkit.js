import validateOption from 'validate-option';
import Component from './component';
import {attachMouseListenersDocumentExtended} from '../util/listener-utils';

const noop = function(){};

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<div class="input-background">
        <svg version="1.2">
            <group></group>
        </svg>
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
    id : null,
    label : 'svg',
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
// Svg
/*--------------------------------------------------------------------------------------------------------------------*/

export default class Svg extends Component{
    constructor(parent,config){
        config = validateOption(config,DefaultConfig);

        super(parent,{
            id : config.id,
            label : config.label,
            template
        });

        this._draw = config.draw;

        //elements
        this._elementSvg = this._element.querySelector('svg');
        this._root = this._elementSvg.querySelector('group');

        //listeners
        this._context = {
            root : this._root,
            draw : this._draw
        };
        this._removeEventListeners = attachMouseListenersDocumentExtended(
            this._root, {
                onMouseDown : config.onMouseDown.bind(this),
                onMouseMove : config.onMouseMove.bind(this),
                onMouseUp   : config.onMouseUp.bind(this),
                onMouseDrag : config.onMouseDrag.bind(this),
                args : [this._context]
            }
        );
        if(config.onKeyDown){
            this._elementSvg.addEventListener('keydown',config.onKeyDown.bind(this));
        }
        if(config.onKeyPress){
            this._elementSvg.addEventListener('keypress',config.onKeyPress.bind(this));
        }
        if(config.onKeyUp){
            this._elementSvg.addEventListener('keyup',config.onKeyUp.bind(this));
        }

        //init
        const size = this._elementSvg.getBoundingClientRect().width;
        this._setSize(size,size);
        config.init.bind(this)();

        const resize = ()=>{
            const size = this._elementSvg.getBoundingClientRect().width;
            this._setSize(size,size);
            //redraw
            this.draw();
        };
        parent.on('scroll-size-change',resize);
        resize();
    }

    static typeName(){
        return 'svg';
    }

    _setSize(width,height){
        this._elementSvg.style.width = width + 'px';
        this._elementSvg.style.height = height + 'px';
        this._elementSvg.setAttribute('viewbox',`0 0 ${width} ${height}`);
    }

    get root(){
        return this._root;
    }

    get svg(){
        return this._elementSvg;
    }

    get width(){
        return parseFloat(this._elementSvg.style.width);
    }

    get height(){
        return parseFloat(this._elementSvg.style.height);
    }

    draw(){
        this._draw(this._context);
    }
}
