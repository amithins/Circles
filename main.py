import logging
from google.appengine.ext import webapp
from google.appengine.api import channel
from google.appengine.api import users
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp import util
from django.utils import simplejson


games = {}

class Game:

    def __init__(self):
        self.player1 = None
        self.player2 = None

        self.state = {
            'units': [
            ]
        }

        self.add_unit(20, 20, 'red')
        self.add_unit(60, 20, 'red')
        self.add_unit(100, 20, 'red')
        self.add_unit(140, 20, 'red')

        self.add_unit(20, 380, 'blue')
        self.add_unit(60, 380, 'blue')
        self.add_unit(100, 380, 'blue')
        self.add_unit(140, 380, 'blue')

    def add_unit(self, x=0, y=0, color='red'):
        self.state['units'].append({
            'x': x,
            'y': y,
            'color': color,
            'target': {
                'x': x,
                'y': y,
            },
        })

    def export_to_json(self):
        return simplejson.dumps({
            'player1': '' if self.player1 is None else self.player1.nickname(),
            'player2': '' if self.player2 is None else self.player2.nickname(),
            'state': self.state,
        })

    def send_state_to_clients(self):
        json = self.export_to_json()
        if (self.player1):
            channel.send_message(self.player1.user_id(), json)
        if (self.player2):
            channel.send_message(self.player2.user_id(), json)

class GamesHandler(webapp.RequestHandler):

    def get(self, game_name):
        global games

        user = users.get_current_user()
        if not user:
            self.redirect(users.create_login_url(self.request.uri))
            return

        if not game_name in games:
            self.error(404)
            self.response.out.write('Could not find game "%s"' % game_name)
            return

        game = games[game_name]

        if game.player1 is None:
            game.player1 = user
        elif game.player1.user_id() == user.user_id():
            pass
        elif game.player2 is None:
            game.player2 = user
        elif game.player2.user_id() == user.user_id():
            pass
        else:
            self.error(500)
            self.response.out.write('Game is full')
            return

        token = channel.create_channel(user.user_id())

        self.response.out.write(template.render('ingame.html', {
            'token': token,
            'nickname': user.nickname(),
        }))

    def post(self):
        """ Create a new game """
        global games
        user = users.get_current_user()
        game = Game()
        game.player1 = user
        games[self.request.get('game_name')] = game

class MoveHandler(webapp.RequestHandler):

    def post(self, game_name, unit_index):
        """ Set target position for a unit  """
        global games

        unit_index = int(unit_index)
        game = games[game_name]

        game.state['units'][unit_index]['target']['x'] = int(self.request.get('x'))
        game.state['units'][unit_index]['target']['y'] = int(self.request.get('y'))

        game.send_state_to_clients()

class KillHandler(webapp.RequestHandler):

    def post(self, game_name, unit_index):
        """ Set target position for a unit  """
        global games
        game = games[game_name]

        user = users.get_current_user()
        new_color = 'red' if user.user_id() == game.player1.user_id() else 'blue'

        unit_index = int(unit_index)
        game.state['units'][unit_index]['color'] = new_color

        game.send_state_to_clients()

class OpenedHandler(webapp.RequestHandler):

    def post(self, game_name):
        global games
        game = games[game_name]
        game.send_state_to_clients()

class MainHandler(webapp.RequestHandler):

    def get(self):
        user = users.get_current_user()
        if not user:
            self.redirect(users.create_login_url(self.request.uri))
            return

        self.response.out.write(template.render('index.html', {
            'nickname': user.nickname(),
        }))

def main():
    application = webapp.WSGIApplication([
        ('/games/(.*)/units/(.*)/move', MoveHandler),
        ('/games/(.*)/units/(.*)/kill', KillHandler),
        ('/games/(.*)/opened', OpenedHandler),
        ('/games/(.*)', GamesHandler),
        ('/games', GamesHandler),
        ('/.*', MainHandler),
    ], debug=True)
    util.run_wsgi_app(application)

if __name__ == '__main__':
    main()
