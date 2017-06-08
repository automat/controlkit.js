import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    const panel = new ControlKit().addPanel({fixed:true})

    for(let i = 0; i < 100; ++i){
        panel.addNumber(settings,'number');
    }

    setInterval(()=>{
        panel.x = Math.random() * window.innerWidth;
        panel.y = Math.random() * window.innerHeight;
    },250);
});