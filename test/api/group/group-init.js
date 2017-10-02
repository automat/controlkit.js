import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    new ControlKit().addPanel()
        .addGroup()
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