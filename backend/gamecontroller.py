import time
from directkeys import PressKey, W, A, S, D


for i in list(range(4))[::-1]:
    print(i+1)
    time.sleep(1)


PressKey(W)