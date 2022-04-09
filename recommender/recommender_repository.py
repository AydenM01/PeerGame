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

        return user_dict

    def get_single_user(self, UserID, n):
        user = self.db.collection('Users Collection').document(f'user{UserID}').get()
        my_user = np.zeros(n)

        temp = user.to_dict()
        if 'Games Played' in temp.keys():
            for key, value in temp['Games Played'].items():
                my_user[value['GameID']] = value['GameID']

        return my_user