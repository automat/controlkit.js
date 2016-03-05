import AbstractElement from "./AbstractElement";
import NodeType from "./NodeType";

const STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';

export default class AbstractBase extends AbstractElement{
    constructor(){
        super(NodeType.BASE);
        this._style = null;
    }
}