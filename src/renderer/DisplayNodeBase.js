import AbstractNodeBase from "./AbstractNodeBase";
import NodeType from "./NodeType";
import Node from "./DisplayNode";
import Style from "./Style";
import computeLayout_ from "css-layout";

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
    }

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

    get children(){
        return this._children;
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