var canvas = document.querySelector('canvas');
var context = canvas.getContext('2d');
var team;
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
	this.standingStill = true;

	this.target = {
		x: startX,
		y: startY
	};

	this.update = function() {
		var xDist = Math.abs(this.target.x - this.x);
		var yDist = Math.abs(this.target.y - this.y);
		this.standingStill = (xDist === 0 && yDist === 0);
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

		if (!this.standingStill && this.color === team) {
			var i;
			var other;
			for (i = 0; i < game.units.length; i += 1) {
				other = game.units[i];
				if (other.standingStill && other.color != this.color && !other.markedAsDead && this.intersectsCircle(other)) {
					other.markedAsDead = true;
					var xhr = new XMLHttpRequest();
					xhr.open('POST', '/games/' + location.href.split('games/')[1] + '/units/' + i + '/kill');
					xhr.send();
				}
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

	this.intersectsCircle = function(other) {
		var xDist = Math.abs(other.x - this.x);
		var yDist = Math.abs(other.y - this.y);

		var d = Math.sqrt((xDist * xDist) + (yDist * yDist));

		return d < (this.radius + other.radius);
	};
}

var Game = function() {
	this.player1 = '';
	this.player2 = '';
	this.units = [];
	this.state = 'waiting'; // waiting, ingame
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
			if (this.units[i].color !== state.units[i].color) {
				this.units[i].color = state.units[i].color;
				this.units[i].markedAsDead = false;
			}
		}
	}

	this.deselectAllUnitsExcept = function(exception) {
		var i;

		for (i = 0; i < this.units.length; i += 1) {
			if (i !== exception) {
				this.units[i].selected = false;
			}
		}
	};

	this.onMouseClick = function(x, y) {
		var i;
		var unit;

		for (i = 0; i < this.units.length; i += 1) {
			unit = this.units[i];
			if (unit.intersectsDot(x, y) && unit.color === team) {
				unit.selected = true;
				this.deselectAllUnitsExcept(i);
				return;
			}
		}

		for (i = 0; i < this.units.length; i += 1) {
			unit = this.units[i];
			if (unit.selected) {
				var params = 'x=' + x + '&y=' + y;
				var xhr = new XMLHttpRequest();
				xhr.open('POST', '/games/' + location.href.split('games/')[1] + '/units/' + i + '/move');
				xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
				xhr.send(params);
			}
		}
	};

	this.update = function() {
		switch (this.state) {
			case 'waiting':
			break;

			case 'ingame':
			this.units.forEach(function(unit) {
				unit.update();
			});
			break;
		}
	};

	this.render = function() {
		context.fillStyle = 'black';
		context.fillRect(0, 0, canvas.width, canvas.height);

		switch (this.state) {
			case 'waiting':
			context.font = '30px Arial';
			context.textAlign = 'center';
			context.textBaseline = 'middle';
			context.fillStyle = 'white';
			context.fillText('Waiting for other player', 200, 200);
			break;

			case 'ingame':
			this.units.forEach(function(unit) {
				unit.render();
			});
			break;
		}
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
	xhr.open('POST', '/games/' + location.href.split('games/')[1] + '/opened');
	xhr.send();
};

onMessage = function(message) {
	var json = JSON.parse(message.data);

	document.querySelector('.sidebar .player1').innerHTML = 'Player 1: ' + json.player1;
	document.querySelector('.sidebar .player2').innerHTML = 'Player 2: ' + json.player2;

	if (json.player1 && json.player2) {
		game.state = 'ingame';
	}

	if (my_nickname === json.player1) {
		team = 'red';
	} else {
		team = 'blue';
	}

	if (game.initialized) {
		game.updateState(json.state);
	} else {
		game.initState(json.state);
	}
}
