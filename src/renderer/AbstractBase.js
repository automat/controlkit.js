import AbstractElement from "./AbstractElement";
import NodeType from "./NodeType";

const STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';

export default class AbstractBase extends AbstractElement{
    constructor(){
        super(NodeType.BASE);
        this._style = null;
    }

    createNode(type){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    createNodes(types){
        let nodes = [];
        for(let type of types){
            nodes.push(this.createNode(type));
        }
        return nodes;
    }

    createNodeFromDetail(detail){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    createNodesFromDetail(details){
        let nodes = [];
        for(let detail of details){
            nodes.push(this.createNodeFromDetail(detail));
        }
        return nodes;
    }

}