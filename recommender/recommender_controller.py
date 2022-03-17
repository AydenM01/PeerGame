from flask import Flask
import recommender_service


class RecommenderController:
    recommender_service = None

    def __init__(self):
        self.recommender_service = recommender_service

    def run(self):
        app = Flask(__name__)

        @app.route("/api/v1/hello")
        def hello_world():
            return "<p>Hello, World!</p>"

        app.run()


if __name__ == "__main__":
    recommender_controller = RecommenderController()
    recommender_controller.run()
