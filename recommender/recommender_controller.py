import datetime

from flask import Flask
from flask_cors import CORS
import recommender_service


class RecommenderController:
    recommender_service = None

    def __init__(self):
        self.recommender_service = recommender_service.RecommenderService()

    def run(self):
        app = Flask(__name__)
        CORS(app)
        
        @app.route("/api/v1/hello")
        def hello_world():
            return "<p>Hello, World!</p>"

        @app.route("/api/v1/get_rec/<UserID>")
        def get_users(UserID):
            games = str(self.recommender_service.recommend_games(int(UserID)))
            return {'games': games}

        @app.route("/api/v1/get_rec/<UserID>/<Genre>")
        def get_users_genre(UserID, Genre):
            games = str(self.recommender_service.recommend_games(int(UserID)))
            return {'games': games}

        app.run()


if __name__ == "__main__":
    recommender_controller = RecommenderController()
    recommender_controller.run()
