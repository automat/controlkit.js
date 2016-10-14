import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    new ControlKit().add(
        (()=>{
            const components = [];
            for(let i = 0; i < 100; ++i){
                components.push({type:'number',object:settings,key:'number'});
            }
            return components;
        })()
    )
});