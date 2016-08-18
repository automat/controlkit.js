module.exports = function reflectChange(obj, callback){
    if(!obj){
        throw new Error('No reflect object set.')
    }
    if(!callback){
        throw new Error('No reflect callback set.');
    }
    var prototype  = Object.getPrototypeOf(obj);
    var properties = Object.getOwnPropertyNames(prototype).slice(1);
    var valuesChanged = {};
    var valuesLast = {};

    function convert(val){
        if(typeof val === 'object'){
            return JSON.stringify(val);
        }
        return val;
    }

    for(var key in obj){
        valuesLast[key] = convert(obj[key]);
    }

    function reflect(){
        valuesChanged = {};

        var changed = false;
        for(var key in obj){
            var value  = obj[key];
            var string = convert(value);

            changed = changed || string !== valuesLast[key];
            valuesLast[key] = string;

            if(!changed){
                continue;
            }
            valuesChanged[key] = value;
        }

        if(!changed){
            return;
        }
        callback(valuesChanged);
    }

    for(var i = 0; i < properties.length; ++i){
        var property = properties[i];

        if(property.charAt(0) === '_'){
            continue;
        }

        var descriptor = Object.getOwnPropertyDescriptor(prototype, property);

        if(descriptor.value){
            descriptor.value = (function(descriptor){
                var function_ = descriptor.value;
                return function(){
                    var value = function_.apply(obj, arguments);
                    reflect();
                    return value;
                }
            })(descriptor);

            Object.defineProperty(obj, property, descriptor);
            continue;
        }

        if(descriptor.set){
            descriptor.set = (function(descriptor){
                var setter = descriptor.set;
                return function(value){
                    setter.call(obj, value);
                    reflect();
                }
            })(descriptor);

            Object.defineProperty(obj, property, descriptor);
        }

        if(descriptor.get){
            descriptor.get = (function(descriptor){
                var getter = descriptor.get;
                return function(){
                    var value = getter.call(obj);
                    reflect();
                    return value;
                }
            })(descriptor);

            Object.defineProperty(obj, property, descriptor);
        }
    }
};
