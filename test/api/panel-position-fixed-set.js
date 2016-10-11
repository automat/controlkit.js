import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    const panel = new ControlKit().addPanel({fixed:true,height:200})
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number')
        .addNumber(settings,'number');

    setInterval(()=>{
        panel.x = Math.random() * window.innerWidth;
        panel.y = Math.random() * window.innerHeight;
    },100);
});