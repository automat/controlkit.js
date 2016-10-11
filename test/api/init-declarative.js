import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {
        a : 0,
        b : 1,
        c : 2,
        sub : {
            a : 'a',
            b : 'b'
        }
    };

    new ControlKit().add({
        label : 'panel',
        height : 300,
        groups : [{
            label : 'Group 0',
            groups : [{
                label : 'Sub-Group 0',
                items : [
                    {type : 'number',object : settings,key : 'a',fd : 4},
                    {type : 'number',object : settings,key : 'b',fd: 0,step: 10,stepShiftMult : 2},
                    {type : 'slider',object : settings,key : c}
                ]
            },{
                label : 'Sub-Group 1',
                items : [
                    {type : 'string',object : settings.sub,key : 'a'},
                    {type : 'string',object : settings.sub,key : 'b'}
                ]
            }]
        }]
    })
});