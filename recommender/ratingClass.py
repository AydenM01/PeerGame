class RatingClass:
    users = []
    movies = []
    ratings = []

    def get_amount_users(self):
        return len(set(self.users)) + 1

    def get_len_users(self):
        return len(self.users)

    def get_max_movies(self):
        return max(self.movies) + 1
