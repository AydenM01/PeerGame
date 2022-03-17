import recommender_repository
import numpy as np
from scipy import spatial


class RecommenderService:
    recommender_repository = None
    matrix = None

    def __init__(self):
        self.recommender_repository = recommender_repository

    def get_similarity(self):
        self.get_data()
        self.make_matrix()
        self.get_cosine()

    def make_matrix(self):
        self.matrix = np.zeros((self.rating_class.get_amount_users(), self.rating_class.get_max_movies()))
        for i in range(self.rating_class.get_len_users()):
            self.matrix[self.rating_class.users[i]][self.rating_class.movies[i]] = self.rating_class.ratings[i]
        np.set_printoptions(threshold=np.inf)

    def get_cosine(self):
        result_dict = {}
        mu = "movie"  # "movie"
        self.matrix = self.matrix.transpose()

        for i in range(1, 11):
            top_5 = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]
            for j in range(0, len(self.matrix)):
                if i != j:
                    result = 1 - spatial.distance.cosine(self.matrix[i], self.matrix[j])
                    if result != 1:
                        top_5.append([j, result])
                    else:
                        top_5.append([j, 0])
                    top_5.sort(key=lambda x: x[1])
                    top_5 = top_5[1:]
            result_dict[i] = top_5
        for key, value in result_dict.items():
            print(
                f"{mu} {key} was most similar to {mu}s {value[4][0]}, {value[3][0]}, {value[2][0]}, {value[1][0]}, {value[0][0]} in that order.")
