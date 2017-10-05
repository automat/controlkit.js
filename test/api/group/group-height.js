import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    new ControlKit().add({
        groups : [{
            label : 'group a',
            height: 300,
            comps : new Array(20).fill({type : 'number',object : settings,key : 'number'})
        }]
    });
});