class SkinConfig{
    constructor(){};
}

class Skin{
    constructor(renderer,config = new SkinConfig()){}

    drawPanel(panel){}

    drawGroup(group){}

    drawSubGroupd(subGroup){};
}