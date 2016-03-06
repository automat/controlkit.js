import AbstractElement from "./AbstractElement";

const STR_ERR_NODE_TARGET_NODE = 'Node is target node.';
const STR_ERR_NODE_INVALID = 'Invalid node.';
const STR_ERR_NODE_NOT_CHILD = 'Node is not child of of target node';

export default class DisplayElement extends AbstractElement{
    constructor(type){
        super(type);
        this._children = [];
        this._childrenOrder = [];
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

    appendChildren(nodes){
        for(var node of nodes){
            if(this.contains(node)){
                this.removeChild(node);
            }
            this.appendChild(node);
        }
    }

    appendChildAt(node,index){
        if(this.contains(node)){
            this.removeChild(node);
        }
        node._parentNode = this;
        this._children.splice(index, 0, node);
        this.forceComputeLayout();
    }

    appendChildrenAt(nodes,index){
        for(var node of nodes){
            this.appendChildAt(node,index++);
        }
    }

    removeChild(node){
        if(!this.contains(node)){
            throw new Error('Node is not child of node.');
        }
        node._parentNode = null;
        this._children.splice(this.indexOf(node), 1);
        this.forceComputeLayout();
    }

    removeChildren(nodes){
        for(var node of nodes){
            this.removeChild(node);
        }
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
        return this._children[0];
    }

    get lastChild(){
        return this._children[this._children.length - 1];
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
}