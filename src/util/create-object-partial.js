export default function createObjectPartial(object,keys){
    object = Object.assign({},object);
    for(const key of keys){
        delete object[key];
    }
    return object;
}