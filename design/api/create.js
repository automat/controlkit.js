const settings = {
    a : 1,
    b : {a : 1},
    c : {a : [0,0],b : 1,c : 'str'},
    d : {
        a : {
            a : 0,
            b : 1,
            c : 2
        }
    }
};

const controlkit = new ControlKit();

// creates single component at default panel + group
controlkit.add({type: 'number', object: settings, key:'a'});

// appends single component to last sub group
controlkit.add({type: 'number', object: settings, key:'a'});
controlkit.add({type: 'number', object: settings, key:'a'});
controlkit.add({type: 'number', object: settings, key:'a'});
controlkit.add({type: 'number', object: settings, key:'a'});
controlkit.add({type: 'number', object: settings, key:'a'});

// creates panel with components at default group
controlkit.add({
    label : 'panel',
    comps : [
        {type: 'number', object: settings, key:'a'},
        {type: 'number', object: settings, key:'a'},
        {type: 'number', object: settings, key:'a'},
        {type: 'number', object: settings, key:'a'}
    ]
});

// creates panel with group and components at default sub-group
controlkit.add({
    label: 'panel',
    groups: [{
        label : 'group',
        comps : [
            {type: 'number', object: settings, key:'a'},
            {type: 'number', object: settings, key:'a'},
            {type: 'number', object: settings, key:'a'},
            {type: 'number', object: settings, key:'a'}
        ]
    }]
});

// creates panel with multiple groups and components at default sub-groups
controlkit.add({
    label: 'panel',
    groups: [{
        label : 'group 1',
        comps : [
            {type: 'number', object: settings, key:'a'},
            {type: 'number', object: settings, key:'a'},
            {type: 'number', object: settings, key:'a'},
            {type: 'number', object: settings, key:'a'}
        ]
    },{
        label : 'group 2',
        comps : [
            {type: 'number', object: settings, key:'a'},
            {type: 'number', object: settings, key:'a'},
            {type: 'number', object: settings, key:'a'},
            {type: 'number', object: settings, key:'a'}
        ]
    }]
});

// creates panel with group, sub-group and components
controlkit.add({
    label : 'panel',
    groups: [{
        label : 'group',
        groups : [{
            label : 'sub-group',
            comps : [
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'}
            ]
        }]
    }]
});

// creates panel with multiple group, sub-group and components
controlkit.add({
    label : 'panel',
    groups: [{
        label : 'group 1',
        groups : [{
            label : 'sub-group 1',
            comps : [
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'}
            ]
        },{
            label : 'sub-group 2',
            comps : [
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'}
            ]
        }]
    },{
        label : 'group 2',
        groups : [{
            label : 'sub-group',
            comps : [
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'}
            ]
        },{
            label : 'sub-group 2',
            comps : [
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'},
                {type: 'number', object: settings, key:'a'}
            ]
        }]
    }]
});