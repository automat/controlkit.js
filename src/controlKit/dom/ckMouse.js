function CKMouse()
{
    this.x = 0;
    this.y = 0;

    var doconmousemove = document.onmousemove || function(){};

    var dx,dy;

    document.onmousemove = function(e)
    {
        doconmousemove(e);

        dx = dy = 0;
        if(!e)e = window.event;
        if(e.pageX)
        {
            dx = e.pageX;
            dy = e.pageY;
        }
        else if(e.clientX)
        {
            dx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            dy = e.clientY + document.body.scrollTop  + document.documentElement.scrollTop;
        }
        this.x = dx;
        this.y = dy;

    }.bind(this);
}

CKMouse.init = function(){if(!CKMouse._instance)CKMouse._instance = new CKMouse();}
CKMouse.getInstance = function(){return CKMouse._instance;};