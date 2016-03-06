export default (options, defaults)=>{
    for(let option in options){
        if(defaults[option] === undefined){
            throw new Error(`Invalid option "${option}". Available options: ${
                    Object.keys(defaults).map((obj)=>{
                        return '"' + obj + '"';
                    }).join(', ')
                }`
            );
        }
    }
    let validated = {};
    for(let option in defaults){
        validated[option] = options[option] === undefined ?
            defaults[option] :
            options[option];
    }
    return validated;
}