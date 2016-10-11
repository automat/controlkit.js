import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    const panel = new ControlKit().addPanel()
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number');

    setInterval(()=>{
        panel.collapse = !panel.collapse;
    },100);
});