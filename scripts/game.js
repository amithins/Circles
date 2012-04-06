var canvas = document.querySelector('canvas');
var context = canvas.getContext('2d');
var game;

canvas.addEventListener('click', function(event) {
	game.onMouseClick(event.clientX, event.clientY);
});

var Entity = function(startX, startY, color) {
	this.x = startX || 0;
	this.y = startY || 0;
	this.color = color || 'red';
	this.radius = 10;
	this.selected = false;

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
		context.fillStyle = this.color;
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

var Game = function() {
	this.player1 = '';
	this.player2 = '';
	this.units = [];
	this.state = 'ingame';
	this.interval;
	this.initialized = false;

	this.initState = function(state) {
		var i;
		var unit;
		for (i = 0; i < state.units.length; i += 1) {
			unit = state.units[i];
			this.units.push(new Entity(unit.x, unit.y, unit.color));
		}
		this.initialized = true;
	};

	this.updateState = function(state) {
		var i;
		var unit;
		for (i = 0; i < state.units.length; i += 1) {
			this.units[i].target.x = state.units[i].target.x;
			this.units[i].target.y = state.units[i].target.y;
		}
	}

	this.onMouseClick = function(x, y) {
		var unitSelected = false;
		var i;
		var unit;

		for (i = 0; i < this.units.length; i += 1) {
			unit = this.units[i];
			if (unit.intersectsDot(x, y)) {
				unit.selected = true;
				unitSelected = true;
				break;
			}
		}

		if (!unitSelected) {
			for (i = 0; i < this.units.length; i += 1) {
				unit = this.units[i];
				if (unit.selected) {
					var params = 'x=' + x + '&y=' + y;
					var xhr = new XMLHttpRequest();
					xhr.open('POST', '/units/' + i + '/move');
					xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
					xhr.send(params);
					unit.selected = false;
				}
			}
		}
	};

	this.update = function() {
		this.units.forEach(function(unit) {
			unit.update();
		});
	};

	this.render = function() {
		context.fillStyle = 'black';
		context.fillRect(0, 0, canvas.width, canvas.height);

		this.units.forEach(function(unit) {
			unit.render();
		});
	};

	this.start = function() {
		self = this;
		self.interval = setInterval(function() {
			try {
				self.update();
				self.render();
			} catch (e) {
				self.pause();
				throw e;
			}
		}, 16);
	};

	this.pause = function() {
		clearInterval(this.interval);
	};
}

game = new Game();
game.start();

onOpened = function() {
	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'opened', true);
	xhr.send();
};

onMessage = function(message) {
	var json = JSON.parse(message.data);
	document.querySelector('.sidebar .player1').innerHTML = 'Player 1: ' + json.player1;
	document.querySelector('.sidebar .player2').innerHTML = 'Player 2: ' + json.player2;
	if (game.initialized) {
		game.updateState(json.state);
	} else {
		game.initState(json.state);
	}
}
