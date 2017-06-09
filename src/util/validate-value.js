export default function validateValue(x,values){
    if(values instanceof Array){
        if(values.indexOf(x) == -1){
            throw new Error(`Invalid value ${x}. Possible values ${values}`);
        }
    } else {
        const entries = [];
        for(const key in values){
            entries.push(values[key]);
        }
        if(entries.indexOf(x) == -1){
            throw new Error(`Invalid value ${x}. Possible values ${entries}`);
        }
    }

}