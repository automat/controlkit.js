import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    const panel = new ControlKit().addPanel();
    const group = panel.addGroup()
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number');

    setInterval(()=>{
        group.enable = !group.enable;
    },250);
});