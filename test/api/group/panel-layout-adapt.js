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
    controlKit.addPanel({height:250})
        .addGroup({label : 'group',height : 50})
        .addSubGroup({label : 'sub-group',height : 100})
        .addNumber(settings,'number0',{id : 'number0'})
        .addString(settings,'string0',{id : 'string0'})
        .addNumber(settings,'number1',{id : 'number1'})
        .addString(settings,'string1',{id : 'string1'})
        .addNumber(settings,'number2',{id : 'number2'})
        .addString(settings,'string2',{id : 'string2'})
        .addGroup()
        .addSubGroup({label : 'sub-group'})
        .addNumber(settings,'number0')
        .addString(settings,'string0')
        .addNumber(settings,'number1')
        .addString(settings,'string1');


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