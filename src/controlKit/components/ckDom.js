var CKDOM = {};

CKDOM.addElement = function(parent,type,params)
{
    var element = document.createElement(type);
    if(params)for(var p in params)element[p] = params[p];

    return parent.appendChild(element);
};

CKDOM.addDiv = function(parent,params)
{
    return CKDOM.addElement(parent,'div',params);
};

CKDOM.addInput = function(parent,params)
{
    return CKDOM.addElement(parent,'input',params);
};

CKDOM.set = function(element,params)
{
    for(var p in params)element[p] = params[p];
    return element;
};

CKDOM.getElementPos = function(element)
{
    var offset  = [0,0];
    var e = element;

    while(e)
    {
        offset[0] += e.offsetLeft;
        offset[1] += e.offsetTop;
        e = e.offsetParent;
    }

    return offset;

};

/*------------------------------------------------------------------------------*/

CKDOM.CSS =
{
    Kit:                   'kit',
    Head:                  'head',
    Block:                 'block',
    Content:               'content',
    List:                  'list',
    HeadLabel:             'headLabel',
    HeadExpandedArrow:     'headExpandedArrow',
    HeadCollapsedArrow:    'headCollapsedArrow',
    CompLabel:             'compLabel',
    CompSlot:              'compSlot',
    CompStepperSlot:       'compStepperSlot',
    CompRangeSliderSlot:   'compRangeSliderSlot',
    CompSliderSlot:        'compSliderSlot',
    CompRangeFieldSlot:    'compRangeFieldSlot',
    StepperBtns:           'stepperBtns',
    StepperInput         : 'compInput',
    StepperBtnUp:          'stepperUp',
    StepperBtnDown:        'stepperDown',
    Select:                'select',
    SelectSelected:        'selected',
    SelectArrow:           'selectArrow',
    Options:               'options',
    LiSelected:            'liSelected',
    SliderSlot:            'sliderSlot',
    SliderBg:              'sliderBg',
    Slider:                'slider'
};
