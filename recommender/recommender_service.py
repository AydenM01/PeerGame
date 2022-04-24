import recommender_repository
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity


class RecommenderService:
    recommender_repository = None

    def __init__(self):
        self.recommender_repository = recommender_repository.RecommenderRepository()

    def recommend_games(self, UserID):
        pd_dict = self.get_data()
        mat = self.create_user_matrix(pd_dict)
        games = self.create_similarity_and_get_top_games(mat, UserID)
        game_names = [self.recommender_repository.get_game_name(game) for game in games]
        return game_names

    def get_data(self):
        return pd.DataFrame(data=self.recommender_repository.get_all_users())

    def create_user_matrix(self, pd_dict):
        n = len(pd_dict)
        max_user = pd_dict['user'].max()
        max_game = pd_dict['game'].max()
        indices = np.array([pd_dict['user'], pd_dict['game']])
        ratings = np.array([pd_dict['rating']][0])
        mat = np.zeros((max_user + 1, max_game + 1))
        for row in range(n):
            user = indices.T[row, 0]
            game = indices.T[row, 1]
            rating = ratings[row]
            mat[user, game] = rating
        return mat

    def create_similarity_and_get_top_games(self, mat, UserID):
        # this will be input
        my_user = self.recommender_repository.get_single_user(UserID, mat.shape[1])

        new_mat = np.vstack([mat, my_user])
        new_extracted_mat = new_mat[:, new_mat.any(0)]
        new_user_similarities = cosine_similarity(new_extracted_mat)
        new_user_sim_df = pd.DataFrame(data=new_user_similarities[1:, 1:],
                                       index=np.arange(1, new_mat.shape[0]),
                                       columns=np.arange(1, new_mat.shape[0]))
        closest_users_df = new_user_sim_df.sort_values(by=[mat.shape[0]], ascending=False)[mat.shape[0]][1:6]
        closest_users = closest_users_df.index.to_numpy()
        closest_users_games = new_mat[closest_users.T]
        closest_games = np.sum(closest_users_games, axis=0)
        closest_games_weighted = self.weigh_games_by_popularity(closest_games)
        closest_games_sorted = np.argsort(closest_games_weighted)
        closest = list(closest_games_sorted[-10:][::-1])
        return self.get_closest_not_played(closest, my_user)

    def weigh_games_by_popularity(self, closest_games):
        for i in range(1, len(closest_games)):
            closest_games[i] *= self.recommender_repository.get_game_popularity(i)
        return closest_games

    def get_closest_not_played(self, closest, my_user):
        for game in my_user:
            if game in closest:
                closest.remove(game)
        return closest[0:5]


