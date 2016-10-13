const map = new Map();

const Reference = {
    set : function(id,object){
        const hasId = map.has(id);
        const hasIdObj = map.has(object.id);
        //invalid
        if(id == null && object.id == null){
            throw new Error(`Invalid id "${id}".`);
        }
        //remove obj
        if(id == null && hasIdObj){
            map.delete(object.id);
            return
        }
        //obj referenced already
        if(id == object.id && hasId){
            return;
        }
        //remove duplicate ids
        if(hasId && hasIdObj){
            map.delete(id);
            map.delete(object.id);
        }

        map.set(id,object);
    },
    get : function(id){
        if(!map.has(id)){
            throw new Error(`Invalid id "${id}".`)
        }
        map.get(id);
    },
    delete : function(id){
        if(!map.has(id)){
            throw new Error(`Invalid id "${id}".`)
        }
        map.delete(id);
    },
    clear : function(){
        map.clear();
    }
};

export default Reference;