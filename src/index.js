/**
 *
 * controlKit.js - A lightweight controller library
 *
 * controlKit.js is available under the terms of the MIT license.  The full text of the
 * MIT license is included below.
 *
 * MIT License
 * ===========
 *
 * Copyright (c) 2013 - 2014 Henryk Wollik. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */



module.exports = {
	setup : function(options){
		return new (require('./core/base'))(options);
	},

	Panel : require('./core/Panel'),
	Group : require('./core/group/Group'),
	SubGroup : require('./core/group/SubGroup'),

	StringInput : require('./component/StringInput'),
	NumberInput : require('./component/NumberInput'),
	Button : require('./component/Button'),
	Range : require('./component/Range'),
	Checkbox : require('./component/Checkbox'),
	Slider : require('./component/Slider'),
	Select : require('./component/Select'),
	Color : require('./component/Color'),
	FunctionPlotter : require('./component/FunctionPlotter'),
	Pad : require('./component/Pad'),
	ValuePlotter : require('./component/ValuePlotter'),
	StringOutput : require('./component/StringOutput'),
	NumberOutput : require('./component/NumberOutput'),
	Canvas : require('./component/Canvas'),
	SVG : require('./component/SVG'),
	Style : require('./core/document/Style')
};