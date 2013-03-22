
CKSelect = function(parent,object,value,label,targetValue,params)
{
    CKComponent.apply(this,arguments);

    params = params || {};
    this._onChange  = params.onChange = params.onChange || this._onChange;

    var d = CKDOM,
        c = d.CSS;

    if(value)
    {
        this._targetKey = targetValue;
        this._values    = this._object[this._key];

        var selectedValue = null;
        var obj    = this._object,
            vals   = this._values,
            key    = this._key,
            target = this._targetKey;

        var i = -1;
        while(++i<vals.length){if(obj[target] == vals[i]){selectedValue = vals[i];break;}}

        d.set(this._divLabel,{className:c.CompLabel,innerHTML:label});
        d.set(this._divComp, {className:c.CompSlot});

        this._select = d.addDiv(this._divComp,  {className: c.Select,innerHTML:selectedValue});
        d.addDiv(this._divComp,  {className: c.SelectArrow});

        var select = this._select,
            options = ControlKit._Options;

        this._select.onclick =  function()
        {
            d.set(select,{className: c.SelectSelected});

            options.build(vals,
                select.innerHTML,
                d.getElementPos(select),
                select.offsetWidth,
                select.offsetHeight,
                function(){obj[target] = select.innerHTML = vals[options.getSelected()];},
                function(){d.set(select, {className: c.Select});}
            );
        };
    }
    else
    {

    }


};

CKSelect.prototype = Object.create(CKComponent.prototype);