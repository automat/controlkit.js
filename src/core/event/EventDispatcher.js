export default class EventDispatcher{
    constructor(){
        this._listeners = {};
    }

    addEventListener(type,method){
        if(type === undefined || type === null){
            throw new Error('No event type specified.');
        } else if(method === undefined || method === null){
            throw new Error('No callback specified.');
        }
        let listeners = this._listeners[type] = this._listeners[type] || [];
        if(listeners.indexOf(method) !== -1){
            return;
        }
        listeners.push(method);
    }

    dispatchEvent(event){
        let type = event.type;
        if(!this.hasEventListener(type)){
            return;
        }
        event._sender = this;
        let methods = this._listeners[type];
        for(let method of methods){
            method(event);
            if(event._stopPropagation){
                return;
            }
        }
    }

    removeEventListener(type,method){
        if(!this.hasEventListener(type)){
            return;
        }
        if(method === null || method === undefined){
            delete this._listeners[type];
            return;
        }
        let index = this._listeners[type].indexOf(method);
        if(index === -1){
            return;
        }
        this._listeners[type].slice(index, 1);
    }

    removeAllEventListeners(){
        this._listeners = {};
    }

    hasEventListener(type){
        return this._listeners[type] !== undefined && this._listeners[type].length !== 0;
    }
}