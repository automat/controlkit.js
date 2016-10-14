import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    const controlKit = new ControlKit();
    controlKit.add({
        groups : [{
            label : 'Group 0',
            subGroups : [{
                label : 'sub group a',
                components:[
                    {type:'number',object:settings,key:'number'},
                    {type:'number',object:settings,key:'number'}
                ]
            },{
                label : 'sub group b',
                components:[
                    {type:'number',object:settings,key:'number'},
                    {type:'number',object:settings,key:'number'}
                ]
            }]

        },{
            label : 'Group 1',
            subGroups : [{
                label : 'sub group a',
                components:[
                    {type:'number',object:settings,key:'number'},
                    {type:'number',object:settings,key:'number'}
                ]
            },{
                label : 'sub group b',
                components:[
                    {type:'number',object:settings,key:'number'},
                    {type:'number',object:settings,key:'number'}
                ]
            }]

        }]
    });
});