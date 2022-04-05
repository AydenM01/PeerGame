import csv
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore


class RecommenderRepository:  # when we create a db, this class will change a lot
    users = []
    movies = []
    ratings = []
    db = None

    def __init__(self):
        # Use the application default credentials
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
        self.db = firestore.client()

    def get_all_users(self):
        docs = self.db.collection('Users Collection').stream()
        user_dict = {}
        user_dict['user'] = []
        user_dict['game'] = []
        user_dict['rating'] = []
        user_dict['time'] = []

        for user in docs:
            temp = user.to_dict()
            if 'Games Played' in temp.keys():
                for key, value in temp['Games Played'].items():
                    user_dict['user'].append(temp['UserID'])
                    user_dict['game'].append(value['GameID'])
                    user_dict['rating'].append(value['Rating'])
                    user_dict['time'].append(value['Time Played'])

        print(user_dict)
        return user_dict

    # def get_single_user(self, id):
    #     docs = self.db.collection('Users Collection').document('User1')
    #     user_list = []
    #
    #     for user in docs:
    #         temp = user.to_dict()
    #         for game in temp['Games Played']:
    #             user_list['user'].append(temp['UserId'])
    #             user_dict['game'].append(game['1'])
    #             user_dict['rating'].append(game['2'])
    #             user_dict['time'].append(game['3'])
    #
    #     print(user_dict)
    #     return user_dict

    def get_all_games(self):
        return self.ratings

    def get_all_ratings(self):
        return self.ratings

    def get_all_times(self):
        return self.ratings
