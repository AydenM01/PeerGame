from flask import Flask
import recommender_service
import recommender_repository


class RecommenderController:
    recommender_service = None

    def __init__(self):
        self.recommender_service = recommender_service.RecommenderService()
        # self.recommender_repository = recommender_repository.RecommenderRepository()

    def run(self):
        app = Flask(__name__)

        @app.route("/api/v1/hello")
        def hello_world():
            return "<p>Hello, World!</p>"

        @app.route("/api/v1/get_users")
        def get_users():
            games = str(self.recommender_service.recommend_games(1))
            return {'games': games}

        app.run()


if __name__ == "__main__":
    recommender_controller = RecommenderController()
    recommender_controller.run()
