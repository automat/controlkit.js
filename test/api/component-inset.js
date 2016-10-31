import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    const panel = new ControlKit().addPanel();
    const group = panel
        .addGroup({label:'Group'})
        .addNumber(settings,'number')
        .addSubGroup({label:'Sub Group',height:100})
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addGroup({height:200})
        .addSubGroup({label:'Sub Group',height:300})
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
});