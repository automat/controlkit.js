const object = {
    a : {a : 1},
    b : {a : [0,0],b : 1,c : 'str'},
    c : {
        a : {
            a : 0,
            b : 1,
            c : 2
        }
    }
};


const panel = {
    groups : [
        {groups: [{
                components : [

                ]
            }
        ]}
    ]
};

const panel0Short = {
    comps : [
        {type:'number',object:object,key:'a'},
        {type:'range',object:object.b,key:'a'},
        {type:'number',object:object,key:'a'},
    ]
};

const panel1Short = {
    label : 'panel 1',
    groups : [{
        id: 'subgroup 1',
        label: 'group 1',
        groups : [{
            label : 'sub group 1',
            comps : [
                {type:'number',object:object,key:'a'},
                {type:'range',object:object.b,key:'a',id:"range"},
                {type:'number',object:object,key:'a'},
            ]
        }]
    }]
};

controlKit.addGroup({label:'crack'})
    .addButton('test',{onChange:()=>{}})
    .addSlider(settings,'k')

controlKit.add({
    groups : [{
        label : 'crack',
        comps : [
            {type: 'button', label: 'test', onChange: ()=>{}},
            {type: 'slider', object: settings, key: 'k'}
        ]
    }]
})

controlKit.add([
    {type: 'button', label: 'test', onChange: ()=>{}},
    {type: 'slider', object: settings, key: 'k'}
]);

const controlKit = new ControlKit();
const panel1Created = controlKit.add(panel1Short);
const [subGroup1,range] = controlKit.get(['sub group 1','range']);