import logging

# Configurando o módulo de logging com um formato mais limpo e legível
logging.basicConfig(
    filename="api.log",
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%d/%m/%Y %H:%M:%S",
    encoding="utf-8",
)

info = logging.getLogger(__name__).info
warning = logging.getLogger(__name__).warning
error = logging.getLogger(__name__).error
critical = logging.getLogger(__name__).critical
