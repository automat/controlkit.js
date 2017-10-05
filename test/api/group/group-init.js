import ControlKit from '../../../index';

window.addEventListener('load',() =>{
    const settings = {number : 0};

    new ControlKit().add({
        label : 'panel',
        groups : [{
            label : 'group a',
            comps : [{type : 'number',object : settings,key : 'number'}]
        }]
    })
});