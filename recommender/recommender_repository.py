import csv


class RecommenderRepository:  # when we create a db, this class will change a lot
    users = []
    movies = []
    ratings = []
    csv_reader = None

    def __init__(self):
        with open('movie-ratings.csv') as csv_file:
            csv_reader = csv.reader(csv_file, delimiter=',')
            line_count = 0
            for row in csv_reader:
                if line_count == 0:
                    line_count += 1
                    continue
                self.users.append(int(row[0]))
                self.movies.append(int(row[1]))
                self.ratings.append(float(row[2]))

                line_count += 1
                if line_count > 10000:
                    break

    def get_users(self):
        return self.users

    def get_movies(self):
        return self.movies

    def get_ratings(self):
        return self.ratings

    def add_user(self, user, movie, rating):
        print("add user")
