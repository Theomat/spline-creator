var canvas;

var points = []
var coefficients = []
var derivatives = []
var probabilities = []
var curveArea = 0.5

var pointSize = 25;
var granularity = 50;

var selectedPoint = -1;
var dragging = false;

var lastUpdate = 0;

var drawGrid = true;
var gridDivisions = 5;

var drawProb = false;
var probGranularity = 20;

const PRIMARY_COLOR = "#2980b9"
const ACCENT_COLOR = "#3498db"
const SELECTION_COLOR = "#f39c12"
const POINT_SIZE = 1.0 / 50;
const NUMBER_REGEXP = /\d+(?:\.\d+)?/gm
const INTERPOLATION_DELAY = 20


var elem_grid_show;
var elem_grid_divs;
var elem_prob_show;
var elem_prob_granularity;
var elem_copy;
var elem_array_start;
var elem_array_end;
var eleme_array_sep;

var xelem;
var yelem;


document.addEventListener("DOMContentLoaded", function (event) {
	M.AutoInit();
	canvas = document.getElementById('canvas');
	canvas.addEventListener('mousedown', function (e) {
		if (e.button == 0) {
			onCanvasLeftClick(canvasToVirtual(getCursorPosition(canvas, e)));
		}
	});

	xelem = document.getElementById('point-x');
	yelem = document.getElementById('point-y');

	xelem.oninput = function () {
		var x = xelem.valueAsNumber;
		var y = yelem.valueAsNumber;
		dragging = true;
		onCanvasDrag({
			x: x,
			y: y
		});
		dragging = false;
	};
	yelem.oninput = xelem.oninput;

	canvas.addEventListener('mouseup', function (e) {
		if (dragging) {
			dragging = false;
			updateInterpolation();
			render();
		}
	});
	canvas.addEventListener('mouseleave', function (e) {
		if (dragging) {
			dragging = false;
			updateInterpolation();
			render();
		}
	});
	canvas.addEventListener('mousemove', function (e) {
		if (selectedPoint >= 0)
			onCanvasDrag(canvasToVirtual(getCursorPosition(canvas, e)));
	});

	addPoint({
		x: 0,
		y: 0
	});
	addPoint({
		x: 1,
		y: 1
	});
	render();

	elem_grid_show = document.getElementById('grid-show');
	elem_grid_show.checked = drawGrid;
	elem_grid_divs = document.getElementById('grid-divs');
	elem_grid_divs.valueAsNumber = gridDivisions;
	elem_grid_divs.disabled = !drawGrid;
	elem_grid_show.oninput = function (event) {
		drawGrid = elem_grid_show.checked
		elem_grid_divs.disabled = !drawGrid;
		render();
	}
	elem_grid_divs.oninput = function (event) {
		gridDivisions = elem_grid_divs.valueAsNumber;
		render();
	}

	elem_prob_show = document.getElementById('probability-show');
	elem_prob_show.checked = drawProb;
	elem_prob_granularity = document.getElementById('probability-granularity');
	elem_prob_granularity.disabled = !drawProb;
	elem_prob_granularity.valueAsNumber = probGranularity;
	elem_prob_show.oninput = function (event) {
		drawProb = elem_prob_show.checked
		elem_prob_granularity.disabled = !drawProb;
		render();
	}
	elem_prob_granularity.oninput = function (event) {
		probGranularity = elem_prob_granularity.valueAsNumber;
		updateProbabilities();
		render();
	}

	elem_copy = document.getElementById('copy');
	elem_copy.readOnly = true;

	elem_array_start = document.getElementById('array-start');
	elem_array_start.value = '[';
	elem_array_end = document.getElementById('array-end');
	elem_array_end.value = ']';
	elem_array_sep = document.getElementById('array-separator');
	elem_array_sep.value = ',';

	onUnselect();
});

function getPointAt(position) {
	index = -1
	for (var i = 0; i < points.length; i++) {
		var point = points[i];
		var dx = (point.x - position.x)
		var dy = (point.y - position.y)
		if (POINT_SIZE * POINT_SIZE >= dx * dx + dy * dy) {
			index = i;
			break;
		}
		if (point.x - position.x >= POINT_SIZE)
			break;
	}
	return index
}

function errorToast(html) {
	M.toast({
		html: html,
		classes: 'red white-text'
	});
}

function successToast(html) {
	M.toast({
		html: html,
		classes: 'green white-text'
	});
}

function setClipboard(text, successMessage) {
	navigator.clipboard.writeText(text).then(function () {
		successToast(successMessage)
	}, function () {
		errorToast("Failed copying to the clipboard !")
	});
}

function canvasToVirtual(point) {
	point.x -= canvas.width * 0.1;
	point.y -= canvas.height * 0.1;
	point.x /= canvas.width * 0.8;
	point.y /= canvas.height * 0.8;
	if (point.y >= -POINT_SIZE && point.y <= 1.0 + POINT_SIZE) {
		point.y = 1 - point.y;
	}
	return point;
}

// --------------- EVENT -------------------------------------------------------

function onCanvasDrag(point) {
	if (!dragging) {
		return;
	}
	dragging = true;
	minX = 0
	if (selectedPoint > 0) {
		minX = points[selectedPoint - 1].x
	}
	maxX = 1
	if (selectedPoint < points.length - 1) {
		maxX = points[selectedPoint + 1].x
	}
	if (point.x > minX && point.x < maxX) {
		points[selectedPoint] = point;
	}
	if ((new Date()).getTime() - lastUpdate >= INTERPOLATION_DELAY) {
		xelem.valueAsNumber = Math.round(points[selectedPoint].x * 100) / 100;
		yelem.valueAsNumber = Math.round(points[selectedPoint].y * 100) / 100;
		updateInterpolation();
		render();
		lastUpdate = (new Date()).getTime();
	}
}

function onCanvasLeftClick(position) {
	if (dragging) {
		return;
	}
	onUnselect();
	// Find if already existing point
	selectedPoint = getPointAt(position)
	if (selectedPoint < 0) {
		selectedPoint = addPoint(position);
	}
	dragging = true;
	onSelectPoint();
	render();
}

function onSelectPoint() {
	var elem = document.getElementById('point-pane');
	elem.classList.remove('hide');

	xelem.valueAsNumber = Math.round(points[selectedPoint].x * 100) / 100;
	yelem.valueAsNumber = Math.round(points[selectedPoint].y * 100) / 100;
	if (selectedPoint > 0) {
		xelem.min = Math.ceil(points[selectedPoint - 1].x * 100) / 100;
	} else {
		xelem.min = 0;
	}
	if (selectedPoint + 1 < points.length) {
		xelem.max = Math.floor(points[selectedPoint + 1].x * 100) / 100;
	} else {
		xelem.max = 1.0;
	}
}

function onUnselect() {
	var elem = document.getElementById('point-pane');
	elem.classList.add('hide');
}

function onClickDelete() {
	if (points.length <= 2) {
		errorToast("A curve must have at least 2 points !");
		return;
	}
	points.splice(selectedPoint, 1);
	selectedPoint = -1;
	onUnselect();
	updateInterpolation();
	render();
}

function onClickClear() {
	points = [];
	coefficients = [];
	selectedPoint = -1;
	onUnselect();
	render();
}

function onClickExport() {
	var start = elem_array_start.value;
	var end = elem_array_end.value;
	var sep = elem_array_sep.value;

	textPart1 = "var x = " + start + points.map(pt => pt.x).join(sep) + end
	textPart2 = "var coefficients = " + start + coefficients.map(array => start + array.join(sep) + end).join(sep) + end
	text = textPart1 + ";\n" + textPart2 + ";"
	setClipboard(text, "Curve copied to the clipboard !")
}

function onClickExportProbability() {
	var start = elem_array_start.value;
	var end = elem_array_end.value;
	var sep = elem_array_sep.value;

	var sum = 0;
	var out = [];
	for (prob of probabilities) {
		sum += prob;
		out.push(sum);
	}

	text = "var outputRange = " + probabilities.length + ";\nvar array = " +
		start + out.join(sep) + end + ";"
	setClipboard(text, "Probability copied to the clipboard !")

}

RegExp.escape = function (s) {
	return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

function onClickImport() {
	var start = RegExp.escape(elem_array_start.value);
	var end = RegExp.escape(elem_array_end.value);
	var sep = RegExp.escape(elem_array_sep.value);
	var content = document.getElementById('import-text').value.replace(/[ \t\n]/g, '');
	var re = new RegExp(start + '(?:' + sep + '?[^' + sep + end + start + '])*' + end, 'gm');
	var arrays = [];
	var xArray;
	while (xArray = re.exec(content)) {
		if (xArray.length > 0) {
			arrays.push(xArray[0]);
		}
	};
	re = NUMBER_REGEXP;
	arrays = arrays.map(function (str) {
		out = [];
		while (xArray = re.exec(str)) {
			if (xArray.length > 0) {
				out.push(parseFloat(xArray[0]));
			}
		}
		return out;
	});
	var theX = arrays[0];
	coefficients = arrays.slice(1);
	if (coefficients.length + 1 != theX.length) {
		errorToast("Failed parsing: incorrect data");
		return;
	}
	points = coefficients.map(function (coeffs, index) {
		return {
			x: theX[index],
			y: polynomial(coeffs, 0)
		};
	});
	points.push({
		x: 1,
		y: polynomial(coefficients[coefficients.length - 1], 1 - theX[theX.length - 2])
	});
	updateInterpolation();
	render();
}

// --------------- LOGIC -------------------------------------------------------

function addPoint(position) {
	// Insert point
	var insertionIndex = 0
	for (; insertionIndex < points.length; insertionIndex++) {
		var point = points[insertionIndex];
		if (point.x > position.x) {
			break;
		}
	}
	points.splice(insertionIndex, 0, position);
	// Interpolate
	if (points.length > 1)
		updateInterpolation()
	return insertionIndex;
}

function approxDerivative(p1, p2) {
	return (p2.y - p1.y) / (p2.x - p1.x)
}

function remap() {
	// Remap to [0;1]
	var startX = points[0].x
	var endX = points[points.length - 1].x
	var startY = Math.min.apply(null, points.map(p => p.y));
	var endY = Math.max.apply(null, points.map(p => p.y));
	for (pt of points) {
		pt.x = (pt.x - startX) / (endX - startX);
		pt.y = (pt.y - startY) / (endY - startY);
	}
}

function updateProbabilities() {
	probabilities = []
	var x = 0;
	var length = 1.0 / probGranularity;
	var ptIndex = 0;
	for (var i = 0; i < probGranularity; i++) {
		var currentX = x;
		var endX = Math.min(x + length, 1.0);
		var parea = 0;
		while (currentX < endX) {
			while (ptIndex + 1 < points.length && points[ptIndex + 1].x <= currentX) {
				ptIndex++;
			}
			var lendX = endX;
			if (points[ptIndex + 1]) {
				lendX = Math.min(lendX, points[ptIndex + 1].x);
			}
			var startx = points[ptIndex].x;
			parea += area(coefficients[ptIndex], currentX - startx, lendX - startx);
			currentX = lendX;
		}
		probabilities.push(parea / curveArea);
		x = endX;
	}
}

function updateInterpolation() {
	remap();
	var n = points.length
	if (n < 2) {
		coefficients = [];
		probabilities = [];
		return;
	}
	coefficients = interpolation(points, approxDerivative(points[0], points[1]), approxDerivative(points[n - 2], points[n - 1]));
	curveArea = 0;
	for (var i = 1; i < points.length; i++) {
		var start = points[i - 1];
		var end = points[i];
		curveArea += area(coefficients[i - 1], 0, end.x - start.x);
	}
	// So now i have the probabilities
	updateProbabilities();

}

function render() {
	if (canvas.getContext) {
		var ctx = canvas.getContext('2d', {
			alpha: false
		});

		scaleX = canvas.width * 0.8;
		scaleY = canvas.height * 0.8;

		pointSize = Math.min(scaleX, scaleY) * POINT_SIZE;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		// Clear
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, canvas.width, canvas.height);



		ctx.translate(canvas.width / 10, canvas.height / 10);
		// Draw grid & axes
		if (drawGrid) {
			// Draw axes
			var divisions = gridDivisions;
			ctx.fillStyle = "black"
			ctx.lineWidth = pointSize / 5;
			ctx.beginPath()
			ctx.moveTo(0, -scaleY * 0.05);
			ctx.lineTo(0, scaleY);
			ctx.moveTo(0, scaleY);
			ctx.lineTo(scaleX + scaleX * 0.05, scaleY);
			ctx.stroke();
			for (var i = 0; i < divisions + 1; i++) {
				var value = Math.round((1 * i / divisions) * 100) / 100
				ctx.textAlign = "center";
				ctx.textBaseline = "top";
				ctx.fillText(value, scaleX * i / divisions, scaleY + scaleY * 0.03);
				ctx.textAlign = "right";
				ctx.textBaseline = "middle";
				ctx.fillText(value, -scaleX * 0.03, scaleY * (divisions - i) / divisions);
			}


			//Draw grid
			ctx.beginPath()
			for (var i = 0; i < divisions; i++) {
				ctx.moveTo(scaleX * (i + 1) / divisions, 0);
				ctx.lineTo(scaleX * (i + 1) / divisions, scaleY);
			}
			ctx.stroke();
			ctx.beginPath()
			for (var i = 0; i < divisions; i++) {
				ctx.moveTo(0, scaleY * i / divisions);
				ctx.lineTo(scaleX, scaleY * i / divisions);
			}
			ctx.stroke();
		}

		ctx.translate(0, scaleY);
		ctx.scale(scaleX, -scaleY);

		// Draw probabilities
		if (drawProb) {
			var pscaleY = 1 / Math.max.apply(null, probabilities);
			ctx.fillStyle = "rgba(231, 76, 60, 0.8)"
			ctx.strokeStyle = "rgba(192, 57, 43,1.0)"
			ctx.lineWidth = POINT_SIZE / 5;
			var x = 0;
			var length = 1.0 / probabilities.length;
			for (var i = 0; i < probabilities.length; i++) {
				var startX = x;
				var endX = x + length;
				var height = probabilities[i] * pscaleY;
				ctx.beginPath();
				ctx.rect(startX, 0, (endX - startX), height);
				ctx.fill();
				ctx.stroke();
				x += length;
			}
		}

		// Paths
		ctx.strokeStyle = ACCENT_COLOR;
		ctx.lineWidth = POINT_SIZE / 3;
		ctx.beginPath();
		ctx.moveTo(points[0].x, points[0].y);
		for (var i = 0; i < coefficients.length; i++) {
			var coeff = coefficients[i];
			var length = points[i + 1].x - points[i].x;
			for (var j = 0; j < granularity; j++) {
				var current = j * length / granularity
				ctx.lineTo(points[i].x + current, polynomial(coeff, current))
			}
		}
		ctx.stroke();

		// Fill points
		ctx.lineWidth = POINT_SIZE / 5;
		ctx.fillStyle = PRIMARY_COLOR;
		ctx.strokeStyle = "black";
		for (var i = 0; i < points.length; i++) {
			ctx.beginPath();
			ctx.arc(points[i].x, points[i].y, POINT_SIZE, 0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();
		}
		// Fill focused point
		if (selectedPoint >= 0) {
			ctx.fillStyle = SELECTION_COLOR;
			ctx.beginPath();
			ctx.arc(points[selectedPoint].x, points[selectedPoint].y, POINT_SIZE, 0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();
		}
	}
}

function getCursorPosition(canvas, event) {
	const rect = canvas.getBoundingClientRect()
	const x = event.clientX - rect.left
	const y = event.clientY - rect.top
	return {
		x: x,
		y: y
	}
}