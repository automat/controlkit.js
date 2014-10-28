D R A F T & E X P E R I M E N T A L

![Peng!](images/image-0.png)

ControlKit.js is a lightweight controller and gui library for browser environments.
Object properties can be modified with basic control components such
as buttons, sliders, string and number inputs,  checkboxes,  selects, color pickers and
range inputs. Some more exotic components like xy-pads, value and function plotters do provide additional
control. * Display components *



![Peng!](images/image-1.png)

When using node or browserify

    npm install controlkit

Alternatively use the standalone version found in ./bin.

    <script type='text/javascript' src='controlKit.min.js'></script>


![Peng!](images/image-2.png)

The two main elements of ControlKit are containers and components. The latter are constructed per panel and
grouped in Groups and SubGroups. To keep the amount of code necessary to setup complex controls to a minimum,
container and component initialization are chained to their parent panel. This way you can write:

    var obj = {
            number : 1.0,
            string : 'abc'
        };

    ControlKit.setup();

    //short version
    //1st group & 1st sub-group level gets auto-created if
    //components are immediately added after panel creation
    ControlKit.addPanel().
        addNumberInput(obj,'number').
        addStringInput(obj,'string');

    //equals
    ControlKit.addPanel().
        addGroup().
            addNumberInput(obj,'number').
            addStringInput(obj,'string');

    //equals
    ControlKit.addPanel().
        addGroup().
            addSubGroup().
               addNumberInput(obj,'number').
               addStringInput(obj,'string');



Customization of groups and components is done via option objects passed on initialization.
All components are interlinked. This way whenever an object property is changed all other components depending
on or manipulating the same property get updated.

![Peng!](images/image-3.png)

###Style

The default styling can be customized. You can either pass a new style on setup:

    ControlKit.setup({style:yourCustomStyleString});

Use an external stylesheet (eg. when developing a custom style) via:

    ControlKit.setup({useExternalStyle:true});

Or create a standalone version of controlKit with a custom built-in style using:

    utils/.build -o outfilePath -s yourCustomStyleStringOrCssFile


###Custom Components

<br/>
<br/>
![Peng!](images/image-4.png)

See wiki
