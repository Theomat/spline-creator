function square(x) {
	return x * x;
}

function zeros(length) {
	return (new Array(length)).fill(0);
}

function interpolation(points, dy0, dyf) {
	matrix = []
	n = points.length
	column = zeros(n)
	// Line 0
	column[0] = dy0;
	line0 = zeros(n)
	line0[0] = 1;
	matrix.push(line0)
	// All lines
	for (var i = 1; i < points.length - 1; i++) {
		x0 = points[i - 1].x
		y0 = points[i - 1].y
		x1 = points[i].x
		y1 = points[i].y
		x2 = points[i + 1].x
		y2 = points[i + 1].y
		line = zeros(n)
		column[i] = 3.0 * ((y1 - y0) / square(x1 - x0) + (y2 - y1) / square(x2 - x1))
		line[i - 1] = 1.0 / (x1 - x0)
		line[i + 1] = 1.0 / (x2 - x1)
		line[i] = 2 * (1.0 / (x1 - x0) + 1.0 / (x2 - x1))
		matrix.push(line)
	}
	// Final line
	column[n - 1] = dyf;
	linef = zeros(n)
	linef[n - 1] = 1;
	matrix.push(linef)
	// Resolution
	outK = linear.solve(matrix, column)
	coefficients = []
	for (var i = 1; i < outK.length; i++) {
		x1 = points[i - 1].x
		y1 = points[i - 1].y
		k1 = outK[i - 1]
		x2 = points[i].x
		y2 = points[i].y
		k2 = outK[i]
		a = k1 * (x2 - x1) - (y2 - y1)
		b = -k2 * (x2 - x1) + (y2 - y1)
		t = 1.0 / (x2 - x1)
		coefficients.push([y1, t * (y2 - y1 + a), square(t) * (b - 2 * a), square(t) * t * (a - b)])
	}
	return coefficients
}

function polynomial(coeffs, x) {
	sum = 0;
	xp = 1;
	for (c of coeffs) {
		sum += xp * c;
		xp *= x;
	}
	return sum;
}

function polynomialIntegral(coeffs, x) {
	sum = 0;
	xp = x;
	for (var i = 0; i < coeffs.length; i++) {
		sum += xp * coeffs[i] / (i + 1);
		xp *= x;
	}
	return sum;
}

function area(coeffs, a, b) {
	return polynomialIntegral(coeffs, b) - polynomialIntegral(coeffs, a);
}