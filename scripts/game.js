var canvas = document.querySelector('canvas');
var context = canvas.getContext('2d');
var interval;

canvas.addEventListener('click', function(event) {
	var unitSelected = false;

	units.forEach(function(unit) {
		if (unit.intersectsDot(event.offsetX, event.offsetY)) {
			unit.selected = true;
			unitSelected = true;
			return 1;
		}
	});

	if (!unitSelected) {
		units.forEach(function(unit) {
			if (unit.selected) {
				unit.target.x = event.offsetX;
				unit.target.y = event.offsetY;
				unit.selected = false;
			}
		});
	}
});

var Entity = function(startX, startY) {
	this.x = startX || 0;
	this.y = startY || 0;
	this.radius = 10;
	this.selected = false;
	this.kills = 0;

	this.target = {
		x: startX,
		y: startY
	};

	this.update = function() {
		var xDist = Math.abs(this.target.x - this.x);
		var yDist = Math.abs(this.target.y - this.y);
		var d = 50 * (16/1000);

		if (xDist < 1) {
			this.x = this.target.x;
		} else {
			if (this.x < this.target.x) {
				this.x += d;
			} else if (this.x > this.target.x) {
				this.x -= d;
			}
		}

		if (yDist < 1) {
			this.y = this.target.y;
		} else {
			if (this.y < this.target.y) {
				this.y += d;
			} else if (this.y > this.target.y) {
				this.y -= d;
			}
		}
	};

	this.render = function() {
		context.fillStyle = 'red';
		context.beginPath();
		context.arc(this.x, this.y, this.radius, 0, Math.PI*2, true);
		context.closePath();
		context.fill();

		if (this.selected) {
			context.strokeStyle = 'white';
			context.strokeRect(this.x-this.radius, this.y-this.radius, this.radius*2, this.radius*2);
		}
	};

	this.intersectsDot = function(x, y) {
		var xDist = Math.abs(x - this.x);
		var yDist = Math.abs(y - this.y);

		var d = Math.sqrt((xDist * xDist) + (yDist * yDist));

		return d < this.radius;
	};
}

var units = [
	new Entity(20, 20),
	new Entity(60, 20),
	new Entity(100, 20),
	new Entity(140, 20)
];

function update() {
	units.forEach(function(unit) {
		unit.update();
	});
}

function render() {
	context.fillStyle = 'black';
	context.fillRect(0, 0, canvas.width, canvas.height);

	units.forEach(function(unit) {
		unit.render();
	});
}

function start() {
	interval = setInterval(function() {
		try {
			update();
			render();
		} catch (e) {
			pause();
			throw e;
		}
	}, 16);
}

function pause() {
	clearInterval(interval);
}

start();
