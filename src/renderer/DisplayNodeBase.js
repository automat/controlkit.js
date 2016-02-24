import AbstractNodeBase from "./AbstractNodeBase";
import NodeType from "./NodeType";
import Node from "./DisplayNode";

const STR_ERROR_INVALID_TYPE = 'Invalid type.';

export default class DisplayNodeBase extends AbstractNodeBase{
    constructor(){
        super();
        this._size = [0,0];
        this._zIndex = 0;
        this._childrenOrder = [];
        this._shouldComputeLayout = false;
    }

    appendChild(node){
        if(this.contains(node)){
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
        if(!this.contains(node)){
            throw new Error('Node is not child of node.');
        }
        node._parentNode = null;
        this._children.splice(this.indexOf(node), 1);
    }

    removeChildren(nodes){
        for(var node of nodes){
            this.removeChild(node);
        }
    }

    contains(node){
        return this._children.indexOf(node) !== -1;
    }

    set size(size){
        this._size[0] = size[0];
        this._size[1] = size[1];
    }

    get size(){
        return this._size.slice(0);
    }

    set width(width){
        this._size[0] = width;
    }

    set height(height){
        this._size[0] = height;
    }

    get width(){
        return this._size[0];
    }

    get height(){
        return this._size[1];
    }

    update(){
        for(let child of this._children){
            child.computeLayout();
        }
    }
}