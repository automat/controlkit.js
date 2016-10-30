import validateKeys from 'validate-keys';

export default function(description,defaults,excludes){
    const config = Object.assign({},description);
    for(const exclude of excludes){
        if(description[exclude] === undefined){
            throw new Error(`Description property "${exclude}" missing.`);
        }
        delete config[exclude];
    }
    validateKeys(config,Object.keys(defaults));
    return config;
}