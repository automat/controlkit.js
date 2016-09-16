import deepEqual from 'deep-equal';
import EventEmitter from 'events';

class ObjectProxy{
    constructor(object){
        this._emitter = new EventEmitter();
        this._handle = null;

        const self = this;
        this._proxy = new Proxy(object,{
            set(target,propKey,value,receiver){
                const value_ = Reflect.get(target,propKey,receiver);
                const success =  Reflect.set(target,propKey,value,receiver);
                if(!deepEqual(value_,value)){
                    const info = {value,handle:self._handle};
                    self._emitter.emit(`${propKey}-change`,info);
                    self._emitter.emit('object-change',info);
                }
                self._handle = -1;
                return success;
            }
        });
    }
    on(type,cb){
        this._emitter.on(type,cb);
    }
    removeEventListener(type,cb){
        this._emitter.removeListener(type,cb);
    }
    set(handle,key,value){
        this._handle = handle;
        this._proxy[key] = value;
    }
    get(key){
        return this._proxy[key];
    }
    get proxy(){
        return this._proxy;
    }
}

let id = 0;

class ObjectProxyValueHandle{
    constructor(proxy,propKey){
        this._proxy = proxy;
        this._propKey = propKey;
        this._id = id++;
    }
    get handle(){
        return this._id;
    }
    set value(value){
        this._proxy.set(this._id,this._propKey,value);
    }
    get value(){
        return this._proxy.get(this._propKey);
    }
    on(type,cb){
        this._proxy.on(type,cb);
    }
    removeEventListener(type,cb){
        this._proxy.removeEventListener(type,cb);
    }
    get proxy(){
        return this._proxy;
    }
    get key(){
        return this._propKey;
    }
}

const map = new Map();

export default function createPropProxy(object,propKey){
    if(object[propKey] === undefined){
        throw new Error(`Invalid object key "${propKey}".`);
    }
    let proxy = null;
    if(map.has(object)){
        proxy = map.get(object);
    } else {
        proxy = new ObjectProxy(object);
        map.set(object,proxy);
    }
    return new ObjectProxyValueHandle(proxy,propKey);
}