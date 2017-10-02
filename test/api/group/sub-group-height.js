import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    new ControlKit().addPanel()
        .addGroup({label:'group'})
        .addSubGroup({label:'sub-group',height:100})
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number');
});