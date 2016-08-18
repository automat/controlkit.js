import EventDispatcher from "./event/EventDispatcher";
import NodeType from "../renderer/NodeType";


export default class History extends EventDispatcher{
    constructor(){
        super();
        this._states = [];
        this._enabled = false;
    }

    get state(){
        return this._states[this._states.length - 1];
    }

    pushState(obj,value){
        if(!this._enabled){
            return;
        }
        this._states.push({obj:obj,value:value});
    }

    popState(){
        if(!this._enabled){
            return;
        }
        let state = this.state;
        if(!state){
            return;
        }
        switch(state.obj.type){
            case NodeType.INPUT_TEXT:
                break;
        }
    }
}