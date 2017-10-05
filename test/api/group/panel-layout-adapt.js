import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {
        number0 : 0,
        string0 : 'abc',
        number1 : 1,
        string1 : 'def',
        number2 : 2,
        string2 : 'ghi'
    };
    const controlKit = new ControlKit();
    controlKit.add({
        height: 250,
        groups : [{
            label: 'group',
            height: 50,
            groups : [{
                label : 'sub-group',
                height : 150,
                comps : [
                    {type:'number',object:settings,key:'number0',id:'number0'},
                    {type:'string',object:settings,key:'string0',id:'string0'},
                    {type:'number',object:settings,key:'number1',id:'number1'},
                    {type:'string',object:settings,key:'string1',id:'string1'},
                    {type:'number',object:settings,key:'number2',id:'number2'},
                    {type:'string',object:settings,key:'string2',id:'string2'}
                ]
            }]
        },{
            groups : [{
                label : 'sub-group',
                comps : [
                    {type:'number',object:settings,key:'number0'},
                    {type:'string',object:settings,key:'string0'},
                    {type:'number',object:settings,key:'number1'},
                    {type:'string',object:settings,key:'string1'}
                ]
            }]
        }]
    });


    let number0, string0, number1, string1, number2, string2;
    [number0,string0,number1,string1,number2,string2] = controlKit.get([
        'number0','string0','number1','string1','number2','string2'
    ]);

    const layoutsComponents = [
        {
            number0 : true,
            string0 : false,
            number1 : true,
            string1 : false,
            number2 : true,
            string2 : false
        }, {
            number0 : false,
            string0 : true,
            number1 : false,
            string1 : true,
            number2 : false,
            string2 : true
        },{
            number0 : true,
            string0 : true,
            number1 : true,
            string1 : true,
            number2 : true,
            string2 : true
        },{
            number0 : false,
            string0 : false,
            number1 : false,
            string1 : false,
            number2 : false,
            string2 : false
        },{
            number0 : true,
            string0 : true,
            number1 : false,
            string1 : false,
            number2 : true,
            string2 : true
        }
    ];

    let index = 0;
    setInterval(()=>{
        const layoutComponents = layoutsComponents[index];
        number0.hide = layoutComponents.number0;
        string0.hide = layoutComponents.string0;
        number1.hide = layoutComponents.number1;
        string1.hide = layoutComponents.string1;
        number2.hide = layoutComponents.number2;
        string2.hide = layoutComponents.string2;
        index = (index + 1) % layoutsComponents.length;
    },250);

});