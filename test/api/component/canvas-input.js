import ControlKit from '../../../index';

window.addEventListener('load',()=>{

    new ControlKit().addPanel()
        .addCanvas({
            init(){
                this.getRandomColor = ()=>{
                    return `rgb(
                        ${Math.floor(Math.random() * 255)},
                        ${Math.floor(Math.random() * 255)},
                        ${Math.floor(Math.random() * 255)}
                    )`;
                };
                this.color = this.getRandomColor();
            },
            onMouseDown(){
                this.color = this.getRandomColor();
            },
            onMouseDrag(e){
                const radius = 5;
                this.ctx.save();
                this.ctx.translate(e.x - radius,e.y);
                this.ctx.fillStyle = this.color;
                this.ctx.beginPath();
                this.ctx.moveTo(radius,0);
                this.ctx.arc(radius,0,radius,0,Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            },
            onKeyPress(e){
                if(e.key == ' '){
                    this.ctx.clearRect(0,0,this.width,this.height);
                }
            }
        });
});