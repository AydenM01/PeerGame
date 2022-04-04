import time
from directkeys import PressKey, W, A, S, D

def main():
    
    for i in list(range(4))[::-1]:
        print(i+1)
        time.sleep(1)

    while True:
        PressKey(W)