class Notifier{
    constructor(observee){
        //this._observer = observer;
        //this._key = key;
    }

    notify(){

    }
}

class ObjectObserver{
    constructor(){
        //{object:obj,keys:[]}
        this._observees = [];
    }

    register(obj,key){
        let observee = null;
        for(let obs of this._observees){
            if(obs.object === obj){
                observee = obs;
            }
        }
        if(!observee){
            observee = {object:obj,keys:[key],notifiers:[]};
            this._observees.push(observee);
        } else {
            if(observee.keys.indexOf(key) === -1){
                observee.push(key);
            }
        }
        let notifier = new Notifier(observee);
        observee.notifiers.push(notifier);
        return notifier;
    }
}