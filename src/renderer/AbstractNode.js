import EventDispatcher from "../core/event/EventDispatcher";
import AbstractBase from "./AbstractBase";
import AbstractElement from "./AbstractElement";
import NodeType from "./NodeType";

const STR_ERROR_INVALID_TYPE = 'Invalid type.';
const STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';

export default class AbstractNode extends AbstractElement{
    constructor(type){
        if(type === NodeType.BASE){
            throw new Error(STR_ERROR_INVALID_TYPE);
        }
        super(type);
    }

    get type(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    set value(value){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get value(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    set textContent(text){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get textContent(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // HIERARCHY
    /*----------------------------------------------------------------------------------------------------------------*/

    get nestingLevel(){
        var level = 0;
        var parentNode = this.parentNode;
        while(!(parentNode instanceof AbstractBase) || !parentNode){
            level++;
            parentNode = parentNode.parentNode;
        }
        return level;
    }

    set parentNode(node){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get parentNode(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get previousSibling(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // STYLE
    /*----------------------------------------------------------------------------------------------------------------*/

    set id(name){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get id(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    set class(name){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get class(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    set style(style){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get style(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // SIZE
    /*----------------------------------------------------------------------------------------------------------------*/

    get offsetSize(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get offsetWidth(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get offsetHeight(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get offsetLeft(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get offsetTop(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // DESCRIPTION
    /*----------------------------------------------------------------------------------------------------------------*/

    toDescription(infoAdditional = ''){
        let level = this.nestingLevel;

        const indentation = '    ';

        function getIndentation(level){
            let indentation_ = '';
            for(let i = 0; i < level; ++i){
                indentation_ += indentation;
            }
            return indentation_;
        }

        let nodeIndentation     = getIndentation(level);
        let childrenIndentation = getIndentation(level + 1);

        let childrenDescription = '[';
        for(var child of this.children){
            childrenDescription += '\n' + childrenIndentation + child.toDescription();
        }

        childrenDescription += (this.children.length > 0 ? ('\n' + nodeIndentation) : '') + ']';
        return '{' +
                    `type: "${ this.type }", `+
                    `level: ${level}, ` +
                    `${this.parentNode !== null ? ('parent: "' + this.parentNode.type + '", ') : ''}` +
                    `${this.id !== null ? ('id: "' + this.id + '", ') : ''}` +
                    `${this.class !== null ? ('class: "' + this.class + '", ') : ''}` +
                    infoAdditional +
                    `children: ${ childrenDescription }` +
                '}';
    }
}