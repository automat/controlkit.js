import ControlKit from '../../../index';

window.addEventListener('load',() =>{
    const settings = {number : 0};

    const groupA = {
        label : 'group a',
        comps : [{type : 'number',object : settings,key : 'number'}]
    };

    const groupB = {
        label : 'group b',
        comps : [{type : 'number',object : settings,key : 'number'}]
    };

    new ControlKit().add({
        label : 'panel',
        groups : [
            groupA,
            groupB
        ]
    })
});