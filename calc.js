(function(window){

	var document = window.document;

	var hlp = {

		events: (function() {

			function bind (src, name, callback) {
				if (src.addEventListener) {
				  src.addEventListener(name, callback, false); 
				} else if (src.attachEvent)  {
				  if (name == 'DOMContentLoaded'){
				  	window.attachEvent('onload', callback); // IE<9
				  } else {
				  	src.attachEvent('on' + name, callback);			  	
				  }
				}
			}

			function unbind (src, name, callback) {
				if (src.removeEventListener) {
				  src.removeEventListener(name, callback); 
				} else if (src.detachEvent)  {
					if (name == 'DOMContentLoaded'){
				  	window.detachEvent('onload', callback); // IE<9
				  } else {
				  	src.detachEvent('on' + name, callback);
				  }
				}
			}		

			return {
				bind: bind,
				unbind: unbind
			};
		})(),

		Pubsub: function() {
			var channels = [];
			return {
				subscribe: function(name, method) {
	 				if (!channels[name]) {
						channels[name] = [];
					}
					channels[name].push(method);
				},
				publish: function (name, data) {
					var channel = channels[name];
					if (channel) {
						for (var i = channel.length - 1; i >= 0; i--) {
							channel[i](data);
						};
					}
				} 
			}
		}
	};
	
	function CalcController (operations) {
		
		var // calculator variables
			resultValue, calcValue, operation, operationsList, calcMode,
			// DOM elements
			displayContainer, operationsContainer,
			// Publish/Subscribe
			pubsub = new hlp.Pubsub();

		operationsList = operations;

		function init () {
			displayContainer = document.getElementById('display');
			operationsContainer = document.getElementById('operations');

			pubsub.subscribe('setOperation', setOperation);
			pubsub.subscribe('setValue', setValue);
			pubsub.subscribe('calc', setResult);

			registerCancellation();
			registerOperations();
			registerValues();
			registerCalc();

			reset();
			display(resultValue);
		}

		function registerCancellation () {
			var cButton = document.getElementById('c'), // reset button
				ceButton = document.getElementById('ce'); // cancel input button
			hlp.events.bind(cButton, 'click', function () {
				reset();
				display(resultValue);
			});
			hlp.events.bind(ceButton, 'click', cancelInput);
		}
		
		function registerOperations () {
			for (var i = operationsList.length - 1; i >= 0; i--) {
				new OperationView({
					el: operationsContainer,
					model: operationsList[i],
					pubsub: pubsub
				}).render();
			};
		}

		function registerValues() {
			var valueButtons = document.getElementsByClassName('valueButton'),
				valueButton,
				value;
			for (var i = valueButtons.length - 1; i >= 0; i--) {
				valueButton = valueButtons[i];
				value = valueButton.getAttribute('data-value');
				(function (v) {
					hlp.events.bind(valueButton, 'click', function () {
						pubsub.publish('setValue', v);
					});
				})(value);
			}
		}

		function registerCalc() {
			var calcButton = document.getElementById('calc');
			hlp.events.bind(calcButton, 'click', calc);
		}

		function setOperation(o) {
			if (calcValue != null) {
				calc();
			}
			operation = o;
			calcMode = true;
		}

		function setValue(value) {
			if (operation == null) {
				if (!calcMode || resultValue == '0') {
					resultValue = value;					
				} else {
					resultValue += value;	
				}				
				display(resultValue);
			} else {
				if (calcValue == null || calcValue == '0') {
					calcValue = value;					
				} else {
					calcValue += value;	
				}
				display(calcValue);
			}
			calcMode = true;
		}

		function calc() {
			var result;
			if (operation != null) {
				result = operation.calc(parseInt(resultValue, 10), parseInt(calcValue, 10));
				pubsub.publish('calc', result);
			}
		}

		function setResult (result) {
			reset();
			resultValue = result;
			display(resultValue);
		}

		function display(value) {
			new DisplayView({
				el: displayContainer,
				model: {
					result: value
				}
			}).render();
		}

		function cancelInput() {
			if (operation == null) {
				reset();
				display(resultValue);
			} else {
				calcValue = '0';
				display(calcValue);
			}
		}

		function reset() {
			resultValue = '0';
			calcValue = null;
			operation = null;			
			calcMode = false;
		}

		return {
			execute: init
		}
	}

	function DisplayView(options) {
		var el = options.el,
			model = options.model;
		return {
			render: function () {
				var resultElement = document.createElement('div');
				while ( el.firstChild ) {
					el.removeChild(el.firstChild);
				} 
				resultElement.setAttribute('id', 'result');
				resultElement.appendChild(document.createTextNode(model.result)); 
				el.appendChild(resultElement);
			}
		}
	}

	function OperationView(options) {
		var el = options.el,
			model = options.model,
			pubsub = options.pubsub;
		return {
			render: function () {
				var operationElement = document.createElement('button');
				operationElement.setAttribute('data-operation', model.name);
				operationElement.appendChild(document.createTextNode(model.displayText)); 
				hlp.events.bind(operationElement, 'click', function () {
					pubsub.publish('setOperation', model);
				})
				el.appendChild(operationElement);
			}
		}
	}

	function OperationModel(name, displayText, calcMethod){
		return {
			name: name,
			displayText: displayText,
			calc: calcMethod
		}
	}

	function Add() {
		return new OperationModel('add', '+', function (a,b) {
			return a + b;
		});
	}

	function Subtract() {
		return new OperationModel('subtract', '-', function (a,b) {
			return a - b;
		});
	}

	function Multiply() {
		return new OperationModel('multiply', '*', function (a,b) {
			return a * b;
		});
	}

	hlp.events.bind(document, 'DOMContentLoaded', function () {
		new CalcController([new Add(), new Subtract(), new Multiply()]).execute();
	});	

})(window);