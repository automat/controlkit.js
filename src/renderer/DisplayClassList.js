export default class DisplayClassList{
    constructor(){
        this._tokens = [];
    }

    add(...names){
        for(let name of names){
            if(this.contains(name)){
                continue;
            }
            this._tokens.push(name);
        }
    }

    remove(...names){
        for(let name of names){
            if(!this.contains(name)){
                continue;
            }
            this._tokens.splice(this._tokens.indexOf(name),1);
        }
    }

    item(index){
        if(this._tokens.length === 0 || index < 0 || index > this._tokens.length - 1){
            throw new RangeError('Item index out of range.');
        }
        return this._tokens[index];
    }

    toggle(name){
        if(!this.contains(name)){
            this._tokens.push(name);
        } else {
            this._tokens.splice(this._tokens.indexOf(name),1);
        }
    }

    contains(name){
        return this._tokens.indexOf(name) !== -1;
    }

    get length(){
        return this._tokens.length;
    }

    setFromString(list){
        this._tokens.length = 0;
        list = list.split(' ');
        for(let item of list){
            this.add(item);
        }
    }

    toString(){
        return this._tokens.join(' ');
    }

}