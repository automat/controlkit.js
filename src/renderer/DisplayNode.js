import AbstractNode  from "./AbstractNode";
import NodeBase      from "./DisplayBase";
import NodeType      from './NodeType';
import NodeEvent     from './NodeEvent';
import MouseEvent    from '../input/MouseEvent';
import KeyboardEvent from '../input/KeyboardEvent';
import Style         from './Style';
import ClassList     from './DisplayClassList';

const EMPTY_FUNC = ()=>{};

const STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';
const STR_ERROR_INVALID_TYPE    = 'Invalid node type.';

export default class DisplayNode extends AbstractNode{
    constructor(type = NodeType.CONTAINER, ...args){
        super();

        this._type = type;
        this._parentNode = null;
        this._classList = new ClassList();
        this._id = null;

        this._style       = new Style();
        this._styleInline = new Style();
        this._layoutNode  = {
            shouldUpdate : true
        };

        this._textContent = '';

        this._bounds = {x0 : 0, y0 : 0, x1 : 0, y1 : 0};
        this._boundsGlobal = {x0 : 0, y0 : 0, x1 : 0, y1 : 0};

        this._children      = [];
        this._childrenOrder = [];

        // first receivers user set via eg. node.onFocus = (e)=>{};
        this._onFocus      = EMPTY_FUNC;
        this._onBlur       = EMPTY_FUNC;
        this._onDblClick   = EMPTY_FUNC;
        this._onMouseDown  = EMPTY_FUNC;
        this._onMouseUp    = EMPTY_FUNC;
        this._onMouseOver  = EMPTY_FUNC;
        this._onMouseLeave = EMPTY_FUNC;
        this._onMouseMove  = EMPTY_FUNC;
        this._onKeyDown    = EMPTY_FUNC;
        this._onKeyPress   = EMPTY_FUNC;
        this._onKeyUp      = EMPTY_FUNC;

        let self = this;
        this.addEventListener(NodeEvent.FOCUS,         function onFocusFirst(e){self.__onFocus(e);self._onFocus(e);});
        this.addEventListener(NodeEvent.BLUR,          function onBlurFirst(e){self.__onBlur(e);self._onBlur(e);});
        this.addEventListener(MouseEvent.DBL_CLICK,    function onMouseDownFirst(e){self.__onDblClick(e);self._onDblClick(e);});
        this.addEventListener(MouseEvent.MOUSE_DOWN,   function onMouseDownFirst(e){self.__onMouseDown(e);self._onMouseDown(e);});
        this.addEventListener(MouseEvent.MOUSE_UP,     function onMouseDownFirst(e){self.__onMouseUp(e);self._onMouseUp(e);});
        this.addEventListener(MouseEvent.MOUSE_OVER,   function onMouseOverFirst(e){self.__onMouseOver(e);self._onMouseOver(e);});
        this.addEventListener(MouseEvent.MOUSE_LEAVE,  function onMouseLeaverFirst(e){self.__onMouseLeave(e);self._onMouseLeave(e);});
        this.addEventListener(MouseEvent.MOUSE_MOVE,   function onMouseMoveFirst(e){  self.__onMouseMove(e);self._onMouseMove(e);});
        this.addEventListener(KeyboardEvent.KEY_DOWN,  function onKeyDown(e){self.__onKeyDown(e);self._onKeyDown(e);});
        this.addEventListener(KeyboardEvent.KEY_PRESS, function onKeyPress(e){self.__onKeyPress(e);self._onKeyPress(e);});
        this.addEventListener(KeyboardEvent.KEY_UP,    function onKeyUp(e){self.__onKeyUp(e);self._onKeyUp(e);});
    }

    set textContent(text){
        this._textContent = '' + text;
        this._layoutNode.shouldUpdate = true;
    }

    get textContent(){
        return this._textContent;
    }

    get type(){
        return this._type;
    }

    cloneNode(deep){}

    /*----------------------------------------------------------------------------------------------------------------*/
    // INTERNAL FIRST RECEIVER
    /*----------------------------------------------------------------------------------------------------------------*/

    __onFocus(){}
    __onBlur(){}
    __onDblClick(){}
    __onMouseDown(){}
    __onMouseUp(){}
    __onMouseOver(){}
    __onMouseLeave(){}
    __onMouseMove(){}
    __onKeyDown(){}
    __onKeyPress(){}
    __onKeyUp(){}

    /*----------------------------------------------------------------------------------------------------------------*/
    // FIRST RECEIVER
    /*----------------------------------------------------------------------------------------------------------------*/

    _setEventHandlerFirst(key,func){
        if(key.charAt(0) === '_'){
            throw new Error('Invalid attempt to set internal handler.');
        }
        let key_ = `_${key}`;
        if(this[key_] === undefined){
            throw new Error(`Invalid first handler "${key}"`);
        }
        this[key_] = (func === null || func === undefined) ? EMPTY_FUNC : func.bind(this);
    }

    set onFocus(func){
        this._setEventHandlerFirst('onFocus',func);
    }

    get onFocus(){
        return this.__onFocus;
    }

    set onBlur(func){
        this._setEventHandlerFirst('onBlur',func);
    }

    get onBlur(){
        return this.__onBlur;
    }

    set onDblClick(func){
        this._setEventHandlerFirst('onDblClick',func);
    }

    get onDblClick(){
        return this.__onDblClick;
    }

    set onMouseDown(func){
        this._setEventHandlerFirst('onMouseDown',func);
    }

    get onMouseDown(){
        return this.__onMouseDown;
    }

    set onMouseUp(func){
        this._setEventHandlerFirst('onMouseUp',func);
    }

    get onMouseUp(){
        return this.__onMouseUp;
    }

    set onMouseOver(func){
        this._setEventHandlerFirst('onMouseOver',func);
    }

    get onMouseOver(){
        return this.__onMouseOver;
    }

    set onMouseLeave(func){
        this._setEventHandlerFirst('onMouseLeave',func);
    }

    get onMouseLeave(){
        return this.__onMouseLeave;
    }

    set onMouseMove(func){
        this._setEventHandlerFirst('onMouseMove',func);
    }

    get onMouseMove(){
        return this.__onMouseMove;
    }

    set onKeyDown(func){
        this._setEventHandlerFirst('onKeyDown',func);
    }

    get onKeyDown(){
        return this.__onKeyDown;
    }

    set onKeyPress(func){
        this._setEventHandlerFirst('onKeyPress',func);
    }

    get onKeyPress(){
        return this.__onKeyPress;
    }

    set onKeyUp(func){
        this._setEventHandlerFirst('onKeyUp',func);
    }

    get onKeyUo(){
        return this.__onKeyUp;
    }


    /*----------------------------------------------------------------------------------------------------------------*/
    // HIERARCHY
    /*----------------------------------------------------------------------------------------------------------------*/

    getHierarchyBranch(){
        function getNodeProperties(node){
            return {type: node._type, classList: node._classList, id: node._id};
        }
        let branch = [getNodeProperties(this)];
        let parentNode = this._parentNode;
        while(parentNode !== null && !(parentNode instanceof NodeBase)){
            branch.push(getNodeProperties(parentNode));
            parentNode = parentNode.parentNode;
        }
        return branch;
    }

    set parentNode(node){
        if(node === this._parentNode){
            return;
        }
        if(this._parentNode !== null){
            this._parentNode.removeChild(this);
        }
        node.appendChild(this);
        this.forceComputeLayout();
    }

    get parentNode(){
        return this._parentNode;
    }

    get previousSibling(){
        if(this._parentNode === null){
            return null;
        }
        let index = this._parentNode.indexOf(this);
        if(index === 0){
            return null;
        }
        return this._parentNode.children[index - 1];
    }

    insertBefore(newNode, referenceNode){
        if(!this.contains(referenceNode)){
            throw new Error('Reference-node is not a child.');
        }
        if(newNode === referenceNode){
            return;
        }
        if(this.contains(newNode)){
            this.removeChild(newNode);
        }
        this.appendChildAt(newNode,this.indexOf(referenceNode));
    }

    appendChild(child){
        if(child === this){
            throw new Error('Child is target node.');
        } else if(child === this._parentNode){
            throw new Error('Child is parent node.');
        }
        if(this.contains(child)){
            return this;
        }
        if(child._parentNode){
            child._parentNode.removeChild(child);
        }

        child._parentNode = this;
        this._children.push(child);
        this.forceComputeLayout();
    }

    appendChildAt(node,index){
        if(this.contains(node)){
            this.removeChild(node);
        }
        node._parentNode = this;
        this._children.splice(index, 0, node);
        this.forceComputeLayout();
    }

    removeChild(node){
        if(!this.contains(node)){
            throw new Error('Node is not child of node.');
        }
        node._parentNode = null;
        this._children.splice(this.indexOf(node), 1);
        this.forceComputeLayout();
    }

    replaceChild(newChild, oldChild){
        if(!this.contains(oldChild)){
            throw new Error('Old node is not a child.');
        }
        if(newChild === oldChild){
            return;
        }
        if(this.contains(newChild)){
            this.removeChild(newChild);
        }

        let index = this.indexOf(oldChild);
        this.appendChildAt(newChild,index);
        this.removeChild(oldChild);
    }

    hasChildNodes(){
        return this._children.length !== 0;
    }

    get children(){
        return this._children;
    }

    get firstChild(){
        return this._children[0] || null;
    }

    get lastChild(){
        return this._children[this._children.length - 1] || null;
    }

    indexOf(node){
        return this._children.indexOf(node);
    }

    contains(node){
         return this.indexOf(node) !== -1;
    }

    get childOrders(){
        return this._childrenOrder.slice(0);
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // STYLE
    /*----------------------------------------------------------------------------------------------------------------*/

    forceComputeLayout() {
        this._layoutNode.shouldUpdate = true;
        //get children draw order
        this._childrenOrder.length = this._children.length;
        for(let i = 0, l = this._children.length; i < l; ++i){
            let child        = this._children[i];
            let zIndexInline = child.style.propertiesSet.zIndex;
            let zIndex       = zIndexInline !== undefined ? zIndexInline : child.style.zIndex;
            this._childrenOrder[i] = [i,zIndex];
        }
        this._childrenOrder.sort((a,b)=>{
            return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0
        });
        if(this._parentNode === null || this._parentNode instanceof NodeBase){
            return;
        }
        this._parentNode.forceComputeLayout();
    }

    set id(name){
        this._id = name;
        this.forceComputeLayout();
    }

    get id(){
        return this._id;
    }

    set style(style){
        //override
        if(style instanceof Style){
            this._styleInline = style.copy();

        //reset
        } else if(style === null){
            this._styleInline.clear();

        //populate from object
        } else if(typeof style === 'object'){
            for(let key in style){
                if(key.charAt(0) === '_'){
                    throw new Error(`Invalid attempt to override private property "${key}".`);
                } else if(key === 'propertiesSet'){
                    throw new Error(`Invalid attempt to override property "${key}".`)
                } else if(this._styleInline[key] === undefined){
                    throw Error(`Invalid property "${key}".`)
                }
                this._styleInline[key] = style[key];
            }

        //Invalid
        } else {
            throw TypeError('Invalid rhs.');
        }
        this.forceComputeLayout();
    }

    get style(){
        return this._styleInline;
    }

    get classList(){
        return this._classList;
    }

    get layoutNode(){
        if(!this._layoutNode.shouldUpdate){
            return this._layoutNode;
        }

        //filter inherited and inline merged properties set
        let style = this._style.copy().merge(this._styleInline).propertiesSet;
        this._layoutNode.style = this._layoutNode.style || {};

        //clear current style
        for(let property in this._layoutNode.style){
            if(property === 'measure'){
                continue;
            }
            delete this._layoutNode.style[property];
        }

        this._layoutNode.children = this._layoutNode.children || [];
        this._layoutNode.children.length = 0;

        //return empty style and children on display 'none'
        if(style.display === 'none'){
            this._layoutNode.style.display = style.display;
            return this._layoutNode;
        }

        //get sub-nodes
        this._layoutNode.children.length = 0;
        for(let child of this._children){
            this._layoutNode.children.push(child.layoutNode);
        }

        //apply style
        for(let property in style){
            this._layoutNode.style[property] = style[property];
        }

        return this._layoutNode;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // POSITION
    /*----------------------------------------------------------------------------------------------------------------*/

    get bounds(){
        let layout = this._layoutNode.layout;
        this._bounds.x0 = layout.left || 0;
        this._bounds.x1 = this._bounds.x0 + layout.width || 0;
        this._bounds.y0 = layout.top || 0;
        this._bounds.y1 = this._bounds.y0 + layout.height || 0;
        return this._bounds;
    }

    get boundsGlobal(){
        let layout = this._layoutNode.layout;

        let x = layout.left || 0;
        let y = layout.top || 0;
        let width  = layout.width || 0;
        let height = layout.height || 0;

        let parentNode = this._parentNode;
        while(parentNode !== null && !(parentNode instanceof NodeBase)){
            layout = parentNode._layoutNode.layout;
            x += layout.left || 0;
            y += layout.top || 0;
            parentNode = parentNode.parentNode;
        }
        this._boundsGlobal.x0 = x;
        this._boundsGlobal.x1 = x + width;
        this._boundsGlobal.y0 = y;
        this._boundsGlobal.y1 = y + height;

        return this._boundsGlobal;
    }

    get offsetSize(){
        return [this._layoutNode.layout.width || 0,this._layoutNode.layout.height || 0];
    }

    get offsetWidth(){
        return this._layoutNode.layout.width || 0;
    }

    get offsetHeight(){
        return this._layoutNode.layout.height || 0;
    }

    hitTestPoint(x,y){
        let boundsGlobal = this.boundsGlobal;
        if(x >= boundsGlobal.x0 && x <= boundsGlobal.x1 &&
           y >= boundsGlobal.y0 && y <= boundsGlobal.y1){
            return {
                node: this,
                point : {
                    x : x - this._boundsGlobal.x0,
                    y : y - this._boundsGlobal.y0
                }
            };
        }
        return null;
    }

    equals(node){
        return node === this;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // BOUNDS
    /*----------------------------------------------------------------------------------------------------------------*/

    toDescription(){
        let inlineStyle = '';
        let inlineProperties = this._styleInline.propertiesSet;
        for(let property in inlineProperties){
            let value = inlineProperties[property];
            value = Array.isArray(value) ? ('[' + value + ']') : value;
            inlineStyle += property + ': ' + value +', ';
        }
        inlineStyle = inlineStyle.substr(0,inlineStyle.length-2);
        return super.toDescription(
            `${ inlineStyle.length > 0 ? ('style: "' + inlineStyle + '", ') : '' }`
        );
    }
}