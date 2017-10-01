export default class Reference{
    constructor(){
        this._map = new Map();
    }

    /**
     * Creates object by id ref.
     * @param id
     * @param obj
     */
    set(id,obj){
        const hasId = this._map.has(id);
        const hasIdObj =  this._map.has(obj.id);
        //invalid
        if(id === null && obj.id === null){
            throw new Error(`Invalid id "${id}".`);
        }
        //remove obj
        if(id === null && hasIdObj){
            this._map.delete(obj.id);
            return
        }
        //obj referenced already
        if(id === obj.id && hasId){
            return;
        }
        //remove duplicate ids
        if(hasId && hasIdObj){
            this._map.delete(id);
            this._map.delete(obj.id);
        }

        this._map.set(id,obj);
    }

    /**
     * Returns object by id.
     * @param id_or_ids
     * @return {Array}
     */
    get(id_or_ids){
        if(id_or_ids instanceof Array){
            const elements = new Array(id_or_ids.length);
            for(let i = 0; i < id_or_ids.length; ++i){
                elements[i] = this.get(id_or_ids[i]);
            }
            return elements;
        }
        if(!this.has(id_or_ids)){
            throw new Error(`Invalid id "${id_or_ids}".`)
        }
        return this._map.get(id_or_ids);
    }

    /**
     * Returns true if object referenced.
     * @param id
     * @return {boolean}
     */
    has(id){
        return this._map.has(id);
    }

    /**
     * Removes id object reference.
     * @param id
     */
    delete(id){
        if(!this._map.has(id)){
            throw new Error(`Invalid id "${id}".`)
        }
        this._map.delete(id);
    }

    /**
     * Completely clears all id object references
     */
    clear(){
        this._map.clear();
    }
}