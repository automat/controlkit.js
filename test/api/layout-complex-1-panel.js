import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {
        number:0,
        range : [0,1],
        boolean : false,
        color : '#ff0000',
        string : 'some text'
    };

    const panel = {
        label : 'panel',
        groups : [{
            label : 'group',
            groups : [{
                label: 'sub-group',
                height : 200,
                comps : [
                    {type:'number',object:settings,key:'number'},
                    {type:'range',object:settings,key:'range'},
                    {type:'range',object:settings,key:'range',readonly:true},
                    {type:'range',object:settings,key:'range',hideSubLabel:true},
                    {type:'range',object:settings,key:'range',readonly:true,hideSubLabel:true},
                    {type:'number',object:settings,key:'number'},
                    {type:'number',object:settings,key:'number'}
                ]
            },{
                label: 'sub-group',
                comps : [
                    {type:'checkbox',object:settings,key:'boolean'},
                    {type:'range',object:settings,key:'range'},
                    {type:'range',object:settings,key:'range'},
                    {type:'slider',object:settings,key:'number',numberInput:false},
                    {type:'number',object:settings,key:'number'},
                    {type:'color',object:settings,key:'color'},
                    {type:'string',object:settings,key:'string'},
                    {type:'string',object:settings,key:'string',preset:['a','b']},
                    {type:'string',object:settings,key:'string',readonly:true},
                    {type:'button',name:'test'},
                    {type:'label',label:'A pure label component'}
                ]
            }]
        },{
            label : 'group',
            groups : [{
                label : 'sub-group',
                comps : [
                    {type:'text',title:'A text component', text:['A component that only displays text, could be used for controlkit config introduction or whatever watching Bojack Horseman right now.','something something']}
                ]
            }]
        }]
    };

    const controlKit = new ControlKit();
    controlKit.add(panel);
});