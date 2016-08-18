import AbstractNode from "../AbstractNode";
import NodeType      from '../NodeType';
import NodeEvent     from '../NodeEvent';

const EMPTY = 'node-type-empty';

export default class HTMLNode extends AbstractNode{
    constructor(type = NodeType.CONTAINER){
        super();

        this._type = type;
        this._parentNode = null;

        this.__node = null;
        switch(type){
            case NodeType.CONTAINER:
                this.__node = document.createElement('div');
                break;
        }

        this.__node.ckNode = this;
    }

    static createFromHTMLNode(node){
        let htmlNode = HTMLNode(EMPTY);
        htmlNode.__node = node;

        //set type here

        return node;
    }

    set textContent(text){
        this.__node.textContent = text;
    }

    get textContent(){
        return this.__node.textContent;
    }

    get type(){
        return this._type;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // HIERARCHY
    /*----------------------------------------------------------------------------------------------------------------*/

    set parentNode(node){
        node.__node.appendChild(this.__node);
    }

    get parentNode(){
        if(this.__node.parentNode === null){
            return null;
        }
        return HTMLNode.createFromHTMLNode(this.__node.parentNode);
    }

    get previousSibling(){
        if(this.__node.parentNode === null){
            return null;
        }
        return HTMLNode.createFromHTMLNode(this.__node.previousSibling);
    }

    insertBefore(newNode,referenceNode){
        if(!this.contains(referenceNode)){
            throw new Error('Reference-node is not a child.');
        }
        if(newNode.equals(referenceNode)){
            return;
        }
        this.__node.insertBefore(newNode,referenceNode);
    }

    appendChild(node){
        if(this.__node === node.__node){
            throw new Error('Child is target node.');
        } else if(node.__node === this.__node.parentNode){
            throw new Error('Child is parent node.');
        }
        this.__node.appendChild(node.__node);
    }

    appendChildAt(node,index){

    }

    removeChild(node){

    }

    replaceChild(newChild, oldChild){

    }

    hasChildNodes(){
        return this.__node.childNodes.length !== 0;
    }

    get children(){
        let children = this.__node.children;
        let out = new Array(children.length);
        for(let i = 0; i < out.length; ++i){
            out[i] = HTMLNode.createFromHTMLNode(children[i]);
        }
    }

    get firstChild(){
        if(this.__node.children.length === 0){
            return null;
        }
        return HTMLNode.createFromHTMLNode(this.__node.children[0]);
    }

    get lastChild(){
        if(this.__node.children.length === 0){
            return null;
        }
        return HTMLNode.createFromHTMLNode(this.__node.children[this.__node.children.length-1]);
    }

    indexOf(node){
        for(let i = 0; i < this.__node.children.length; ++i){
            if(node.__node === this.__node.children[i]){
                return i;
            }
        }
        return -1;
    }

    contains(node){

    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // STYLE
    /*----------------------------------------------------------------------------------------------------------------*/

    set id(name){
        this.__node.setAttribute('id',name);
    }

    get id(){
        return this.__node.getAttribute('id');
    }
    
    set style(style){

    }

    get style(){
        return this.__node.style;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // POSITION
    /*----------------------------------------------------------------------------------------------------------------*/

    get offsetSize(){
        return {width:this.__node.offsetWidth,height:this.__node.offsetHeight};
    }

    get offsetWidth(){
        return this.__node.offsetWidth;
    }

    get offsetHeight(){
        return this.__node.offsetHeight;
    }




    equals(node){
        return node.__node === this.__node;
    }





}