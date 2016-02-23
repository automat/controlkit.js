export default class EventDispatcher {
    constructor(){
        this._listeners = [];
    }

    addEventListener(type, listener, methodName){
        if(type === undefined || type === null){
            throw new Error('No listener object specified.');

        }else if(methodName === undefined || methodName === null){
            throw new Error('No callback specified.');
        }

        this._listeners[type] = this._listeners[type] || {};
        this._listeners[type][methodName] = this._listeners[type][methodName] || [];

        if(this._listeners[type][methodName].indexOf(listener) !== -1){
            return;
        }

        this._listeners[type][methodName].push(listener);
    }

    dispatchEvent(event){
        var type = event.getType();
        if(!this.hasEventListener(type)){
            return;
        }
        event.setSender(this);

        var methods = this._listeners[type];
        for(var m in methods){
            var objects = methods[m];
            var stopPropagation = false;

            for(var i = 0, l = objects.length; i < l; ++i){
                objects[i][m](event);
                if(event._stopPropagation){
                    stopPropagation = true;
                    break;
                }
            }

            if(stopPropagation){
                break;
            }
        }
    }

    removeEventListener(type, obj, methodName){
        if(!this.hasEventListener(type)){
            return;
        }

        if(obj === undefined && methodName === undefined){
            delete this._listeners[type];
            return;

        }else if(methodName === undefined){
            for(var m in this._listeners){
                var objects = this._listeners[m];
                var index = objects.indexOf(objects);

                if(index !== -1){
                    objects.splice(index, 1);
                }
            }

            for(var m in this._listeners){
                if(this._listeners[m].length === 0){
                    delete this._listeners[m];
                }
            }

            return;
        }

        var listeners = this._listeners[type][methodName];

        if(listeners === undefined){
            throw new Error('No callback matching the method specified.');

        }else if(listeners.indexOf(obj) === -1){
            throw new Error('No listener object matching the object specified.');
        }

        listeners.slice(listeners.indexOf(obj), 1);

        if(listeners.length !== 0){
            return;
        }

        delete this._listeners[type][methodName];
    }

    removeAllEventListeners(){
        this._listeners = {};
    }

    hasEventListener(type){
        return this._listeners[type] !== undefined && this._listeners[type] !== null;
    }
}
