from flask import Flask

from recommender import Similarity

app = Flask(__name__)


@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"


@app.route("/test_recommender")
def test_recommender():
    sim = Similarity()
    sim.get_similarity()


if __name__ == "__main__":
    app.run()
