var CKDOM = {};

CKDOM.addElement = function(parent,type,params,before)
{
    var element = document.createElement(type);
    if(params)for(var p in params)element[p] = params[p];

    return before ? parent.insertBefore(element,parent.firstChild): parent.appendChild(element);
};

CKDOM.addDiv = function(parent,params)
{
    return CKDOM.addElement(parent,'div',params);
};

CKDOM.addDivBefore = function(parent,params)
{
    return CKDOM.addElement(parent,'div',params,true)
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
    StepperInput:          'compInput',
    StepperBtnUp:          'stepperUp',
    StepperBtnDown:        'stepperDown',
    Select:                'select',
    SelectSelected:        'selected',
    SelectTextLabel:       'selectTextLabel',
    Options:               'options',
    LiSelected:            'liSelected',
    SliderSlot:            'sliderSlot',
    SliderBg:              'sliderBg',
    Slider:                'slider',
    CompAutoSlot:   'compAutoSlot',
    PresetBtn:             'presetBtn',
    PresetBtnActive:       'presetBtnActive',
    TextWPresetInput:      'compInput',
    ArrowSmallMax:         'arrowSmallMax',
    ArrowSmallMin:         'arrowSmallMin',
    ArrowSelect:           'arrowSelect',
    Scrollbar:             'scrollbar',
    ScrollbarTrack:        'track',
    ScrollbarBtnUp:        'btnUp',
    ScrollbarBtnDown:      'btnDown'

};
