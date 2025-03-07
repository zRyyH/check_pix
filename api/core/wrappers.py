from core.logger import critical
import functools


# Decorator para tratar exceções e logar erros críticos
def safe_execute(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            critical(f"Erro ao executar a função {func.__name__}: {e}")
            return None

    return wrapper
