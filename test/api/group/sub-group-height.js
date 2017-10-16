import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    const controlKit = new ControlKit();
    controlKit.add({
        groups : [{
            label : 'group',
            groups : [{
                label : 'sub-group',
                height : 100,
                comps : [
                    {type:'number',object:settings,key:'number'},
                    {type:'number',object:settings,key:'number'}
                ]
            }]
        }]
    })
});