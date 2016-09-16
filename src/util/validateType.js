export default function validateType(object_or_value,key_or_expected,expected){
    let value;
    if(expected === undefined){
        value = object_or_value;
        expected = key_or_expected;
    } else {
        value = object_or_value[key_or_expected];
    }
    if(value === undefined){
        throw new TypeError(`Object value with key "${key_or_expected}" is undefined.`);
    }
    if(value === null){
        throw new TypeError(`Object value with key "${key_or_expected}" is null.`);
    }
    if(value !== expected.name.toLowerCase() && !(value instanceof expected)){
        throw new TypeError(`Object value with key "${key_or_expected}" is not of type ${expected.name}.`);
    }
}