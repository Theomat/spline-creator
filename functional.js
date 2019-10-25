if (!Array.prototype.fold) {
	Array.prototype.fold = function (f, x0) {
		var x = x0;
		for (var i = 0; i < this.length; i++) {
			x = f(x, this[i], i);
		}
		return x;
	}
}
if (!Function.prototype.compose) {
	Function.prototype.compose = function (f) {
		return function () {
			return this.apply(null, f.apply(null, (arguments)));
		}
	};
}
if (!Function.prototype.curry) {
	Function.prototype.curry = function () {
		var f = this;
		for (var i = 0; i < arguments.length; i++) {
			f = f.bind(null, arguments[i]);
		}
		return f;
	};
}
if (!Math.sum) {
	Math.sum = function () {
		var sum = 0;
		for (var i = 0; i < arguments.length; i++) {
			sum += arguments[i];
		}
		return sum;
	}
}
if (!Math.multiply) {
	Math.multiply = function () {
		var product = 1;
		for (var i = 0; i < arguments.length; i++) {
			product *= arguments[i];
		}
		return product;
	}
}
if (!Boolean.and) {
	Boolean.and = function () {
		for (var i = 0; i < arguments.length; i++) {
			if (!arguments[i])
				return false;
		}
		return true;
	}
}
if (!Boolean.or) {
	Boolean.or = function () {
		for (var i = 0; i < arguments.length; i++) {
			if (arguments[i])
				return true;
		}
		return false;
	}
}
if (!Boolean.not) {
	Boolean.not = x => !x
}
FunctionBuilder = {
	is: x => (y => y == x),
	isNot: x => (y => y != x)
}