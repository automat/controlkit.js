import AbstractNode from "./AbstractNode";
import * as Matrix33 from "../core/math/Matrix33";
import NodeBase from "./DisplayNodeBase";
import NodeType from './NodeType';
import Style from './Style';

const STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';
const STR_ERROR_INVALID_TYPE    = 'Invalid node type.';

function containsPoint(point,bounds){
    return point[0] >= bounds[0] &&
           point[0] <= bounds[2] &&
           point[1] >= bounds[1] &&
           point[1] <= bounds[3];
}

export default class DisplayNode extends AbstractNode{
    constructor(type = NodeType.CONTAINER, ...args){
        super();

        this._type = type;
        this._parentNode = null;
        this._class = null;
        this._id = null;

        this._style       = new Style();
        this._styleInline = new Style();
        this._layoutNode  = {
            shouldUpdate : true
        };

        this._textContent = '';

        this._transform = Matrix33.create();
        this._boundsGlobal = [0,0,0,0];
        this._boundsAllGlobal  = [0,0,0,0];

        this._children      = [];
        this._childrenOrder = [];

        this._overflow = true;
        this._visible = true;
    }

    set textContent(text){
        this._textContent = '' + text;
        this._layoutNode.shouldUpdate = true;
    }

    get textContent(){
        return this._textContent;
    }

    cloneNode(){}

    get type(){
        return this._type;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // HIERARCHY
    /*----------------------------------------------------------------------------------------------------------------*/

    getHierarchyBranch(){
        function getNodeProperties(node){
            return {type: node._type, class: node._class, id: node._id};
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

    /*----------------------------------------------------------------------------------------------------------------*/
    // STYLE
    /*----------------------------------------------------------------------------------------------------------------*/

    forceComputeLayout() {
        this._layoutNode.shouldUpdate = true;
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

    set class(name){
        this._class = name;
        this.forceComputeLayout();
    }

    get class(){
        return this._class;
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

    set position(pos){
        this._transform[6] = pos[0];
        this._transform[7] = pos[1];
        this.forceComputeLayout();
    }

    set positionX(x){
        this._transform[6] = x;
        this.forceComputeLayout();
    }

    set positionY(y){
        this._transform[7] = y;
        this.forceComputeLayout();
    }

    get position(){
        return [this._transform[6],this._transform[7]];
    }

    get positionX(){
        return this._transform[6];
    }

    get positionY(){
        return this._transform[7];
    }

    set positionGlobal(pos){
        let global = this.positionGlobal;
        let diffx = pos[0] - global[0];
        let diffy = pos[1] - global[1];
        this._transform[6] = diffx;
        this._transform[7] = diffy;
        this.forceComputeLayout();
    }

    set positionGlobalX(x){
        let global = this.positionGlobalX;
        this._transform[6] = x - global;
        this.forceComputeLayout();
    }

    set positionGlobalY(y){
        var posAbsy = this.positionGlobalY;
        this._transform[7] = y - posAbsy;
        this.forceComputeLayout();
    }

    get positionGlobal(){
        let transform = this.transformGlobal;
        return [transform[6], transform[7]];
    }

    get positionGlobalX(){
        let transform = this.transformGlobal;
        return transform[6];
    }

    get positionGlobalY(){
        let transform = this.transformGlobal;
        return transform[7];
    }

    get transformGlobal(){
        let transform = Matrix33.copy(this._transform);
        if(this._parentNode === null || this._parentNode instanceof NodeBase){
            return transform;
        }
        return Matrix33.mult(transform,this._parentNode.transformGlobal);
    }

    get offsetSize(){
        return [this._layoutNode.width || 0,this._layoutNode.height || 0];
    }

    get offsetWidth(){
        return this._layoutNode.width || 0;
    }

    get offsetHeight(){
        return this._layoutNode.height || 0;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // BOUNDS
    /*----------------------------------------------------------------------------------------------------------------*/

    get boundsGlobal(){
        return this._boundsGlobal.slice(0);
    }

    get boundsGlobalAll(){
        let overflow = this._style.overflow = 'hidden';
        return overflow ? this._boundsGlobal.slice(0) : this._boundsAllGlobal.slice(0);
    }

    _updateBoundsAllGlobal(){
        this._boundsAllGlobal = this.boundsGlobal;

        for(var i = 1, l = this._children.length; i < l; ++i){
            var bounds = this._children[i].boundsGlobal;

            if(bounds[0] < this._boundsAllGlobal[0]){
                this._boundsAllGlobal[0] = bounds[0];
            }
            if(bounds[1] < this._boundsAllGlobal[1]){
                this._boundsAllGlobal[1] = bounds[1]
            }
            if(bounds[2] > this._boundsAllGlobal[2]){
                this._boundsAllGlobal[2] = bounds[2];
            }
            if(bounds[3] > this._boundsAllGlobal[3]){
                this._boundsAllGlobal[3] = bounds[3];
            }
        }
    }

    hitTestBoundsGlobal(point){
        return containsPoint(point,this._boundsGlobal);
    }

    hitTestBoundsAllGlobal(point){
        return containsPoint(point,this._boundsAllGlobal);
    }

    _updateBoundsGlobal(){
        var position = this.positionGlobal;

        this._boundsGlobal[0] = position[0];
        this._boundsGlobal[1] = position[1];
        this._boundsGlobal[2] = position[0] + this._size[0];
        this._boundsGlobal[3] = position[1] + this._size[1];
    }

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