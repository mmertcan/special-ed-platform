def my_decorator(func):
    print("Registering", func.__name__)
    return func


@my_decorator
def test():
    return "hello"

@my_decorator

def bla():
    return "bla"