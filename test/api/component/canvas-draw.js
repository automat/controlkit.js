import ControlKit from '../../../index';

window.addEventListener('load',()=>{

    const controlKit = new ControlKit();

    controlKit.addPanel().addCanvas({id:'canvas'});

    setInterval(()=>{
        const canvas = controlKit.get('canvas');
        const width = canvas.width;
        const height = canvas.height;
        const ctx = canvas.ctx;

        ctx.clearRect(0,0,width,height);
        ctx.strokeStyle = `rgb(
            ${Math.floor(Math.random() * 255)},
            ${Math.floor(Math.random() * 255)},
            ${Math.floor(Math.random() * 255)}
        )`;

        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
    },100)
});