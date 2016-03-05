export default class Event{
    constructor(type, data = null){
        this._sender = null;
        this._type   = type;
        this._data   = data;

        this._stopPropagation = false;
    }

    stopPropagation(){
        this._stopPropagation = true;
    }

    get sender(){
        return this._sender;
    }

    get type(){
        return this._type;
    }

    get data(){
        return this._data;
    }
}