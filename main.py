import logging
from google.appengine.ext import webapp
from google.appengine.api import channel
from google.appengine.api import users
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp import util
from django.utils import simplejson

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
game = Game()

class MoveHandler(webapp.RequestHandler):

    def post(self, index):
        index = int(index)
        game.state['units'][index]['target']['x'] = int(self.request.get('x'))
        game.state['units'][index]['target']['y'] = int(self.request.get('y'))
        game.send_state_to_clients()

class StateHandler(webapp.RequestHandler):

    def get(self):
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(game.export_to_json())

class OpenedHandler(webapp.RequestHandler):

    def post(self):
        game.send_state_to_clients()

class FlushHandler(webapp.RequestHandler):

    def post(self):
        global game
        game = None

class MainHandler(webapp.RequestHandler):

    def get(self):
        user = users.get_current_user()
        if not user:
            self.redirect(users.create_login_url(self.request.uri))
            return

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

        self.response.out.write(template.render('index.html', {
            'token': token,
            'user_id': user.user_id(),
            'user_email': user.email(),
        }))

def main():
    application = webapp.WSGIApplication([
        ('/units/(.*)/move', MoveHandler),
        ('/opened', OpenedHandler),
        ('/flush', FlushHandler),
        ('/state', StateHandler),
        ('/.*', MainHandler),
    ], debug=True)
    util.run_wsgi_app(application)

if __name__ == '__main__':
    main()
