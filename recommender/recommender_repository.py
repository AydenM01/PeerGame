from random import randint

import firebase_admin
import numpy as np
from firebase_admin import credentials
from firebase_admin import firestore

class RecommenderRepository:
    db = None

    def __init__(self):
        # Use the application default credentials
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
        self.db = firestore.client()

    def get_all_users(self):
        docs = self.db.collection('Users Collection').stream()
        user_dict = {'user': [], 'game': [], 'rating': [], 'time': []}

        for user in docs:
            temp = user.to_dict()
            if 'Games Played' in temp.keys():
                for key, value in temp['Games Played'].items():
                    user_dict['user'].append(temp['UserID'])
                    user_dict['game'].append(value['GameID'])
                    user_dict['rating'].append(value['GameID'])
                    user_dict['time'].append(value['Time Played'])
        # for i in range(10):
        #     game = randint(1, 8)
        #     for j in range(10):
        #         user_dict['user'].append(i + 1)
        #         user_dict['game'].append(game + j)
        #         user_dict['rating'].append(game + j)
        #         user_dict['time'].append(randint(1, 30))
        return user_dict

    def get_single_user(self, UserID, n):
        user = self.db.collection('Users Collection').document(f'user{UserID}').get()
        my_user = np.zeros(n)

        temp = user.to_dict()
        if 'Games Played' in temp.keys():
            for key, value in temp['Games Played'].items():
                my_user[value['GameID']] = value['GameID']

        return my_user
    
    def get_game_name(self, game_id):
        get_name = self.db.collection('Games Collection').document(f'game{game_id}').get({u'Title'})
        name = u'{}'.format(get_name.to_dict()['Title'])
        return name

    def get_game_popularity(self, game_id):
        get_pop = self.db.collection('Games Collection').document(f'game{game_id}').get({u'Popularity'})
        pop = u'{}'.format(get_pop.to_dict()['Popularity'])
        return int(pop)
