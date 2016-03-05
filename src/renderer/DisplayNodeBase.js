import AbstractNodeBase from "./AbstractNodeBase";
import NodeType from "./NodeType";
import Node from "./DisplayNode";
import Style from "./Style";
import computeLayout_ from "css-layout";
import MouseEvent from "../input/MouseEvent";

const STR_ERR_NODE_TARGET_NODE = 'Node is target node.';
const STR_ERR_NODE_INVALID = 'Invalid node.';
const STR_ERR_NODE_NOT_CHILD = 'Node is not child of of target node';


export default class DisplayNodeBase extends AbstractNodeBase{
    constructor(){
        super();
        this._children = [];
        this._childrenOrder = [];
        this._style = new Style();
        this._layoutNode = {};

        this._nodeHovered = null;
        this._boundsGlobal = {x0:0,y0:0,x1:0,y1:0};
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // INPUT HANDLE
    /*----------------------------------------------------------------------------------------------------------------*/

    _hitTestChildren(x, y){
        let path = [];
        function hitTestNode(node){
            if(node.hitTestPoint(x,y) === null){
                return;
            }
            path.push(node);
            for(let child of node.children){
                hitTestNode(child);
            }
        }
        for(let child of this._children){
            hitTestNode(child);
        }
        path.unshift(this);
        return {
            node: path[path.length - 1],
            path: path
        };
    }

    _broadcastMouseEvent(type, e){
        let result = this._hitTestChildren(e.x,e.y);
        e.node = result.node;
        e.path = result.path;
        for(let node of result.path){
            node.dispatchEvent(new MouseEvent(type,e));
        }
    }

    handleMouseDown(e){
        this._broadcastMouseEvent(MouseEvent.MOUSE_DOWN,e);
    }

    handleMouseUp(e){
        this._broadcastMouseEvent(MouseEvent.MOUSE_UP,e);
    }

    handleMouseMove(e){
        let result = this._hitTestChildren(e.x,e.y);
        e.node = result.node;
        e.path = result.path;

        if(this._nodeHovered !== result.node){
            if(this._nodeHovered !== null){
                this._nodeHovered.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_LEAVE,e));
            }
            result.node.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_OVER,e));
            this._nodeHovered = result.node;
        }

        for(let node of result.path){
            node.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_MOVE,e));
        }
    }

    handleKeyDown(e){

    }

    handleKeyUp(e){

    }

    getChildAtPoint(x,y){
        let result = this._hitTestChildren(x,y);
    }

    get boundsGlobal(){
        return this._boundsGlobal;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // HIERARCHY
    /*----------------------------------------------------------------------------------------------------------------*/

    get layoutNode(){
        return this._layoutNode;
    }

    updateLayoutNode(){
        this._layoutNode.style = this._style.propertiesSet;
        this._layoutNode.children = this._layoutNode.children || [];
        this._layoutNode.children.length = 0;
        for(let child of this._children){
            this._layoutNode.children.push(child.layoutNode);
        }
        return this._layoutNode;
    }

    get style(){
        return this._style;
    }

    get layout(){
        return this._layoutNode.layout;
    }

    appendChild(node){
        if(node === this){
            throw new Error(STR_ERR_NODE_TARGET_NODE);
        } else if (node === null || node === undefined || !(node instanceof Node)){
            throw new Error(STR_ERR_NODE_INVALID);
        } else if(this.contains(node)){
            return;
        }
        if(node._parentNode){
            node._parentNode.removeChild(node);
        }
        node._parentNode = this;
        this._children.push(node);
    }

    appendChildren(nodes){
        for(let node of nodes){
            if(this.contains(node)){
                this.removeChild(node);
            }
            this.appendChild(node);
        }
    }

    removeChild(node){
        if(node === this){
            throw new Error(STR_ERR_NODE_TARGET_NODE);
        } else if(node === null || node === undefined || !(node instanceof Node)){
            throw new Error(STR_ERR_NODE_INVALID);
        } else if(!this.contains(node)){
            throw new Error(STR_ERR_NODE_NOT_CHILD);
        }
        node._parentNode = null;
        this._children.splice(this.indexOf(node), 1);
    }

    removeChildren(nodes){
        for(var node of nodes){
            this.removeChild(node);
        }
    }

    get firstChild(){
        return this._children[0];
    }

    get lastChild(){
        return this._children[this._children.length - 1];
    }

    get children(){
        return this._children;
    }

    contains(node){
        if(node === this){
            throw new Error(STR_ERR_NODE_TARGET_NODE);
        }
        return this._children.indexOf(node) !== -1;
    }

    set size(size){
        this._style.width  = size[0];
        this._style.height = size[1];
    }

    get size(){
        return this._style.width;
    }

    set width(width){
        this._style.width = width;
    }

    set height(height){
        this._style.height = height;
    }

    get width(){
        return this._style.width;
    }

    get height(){
        return this._style.height;
    }

}