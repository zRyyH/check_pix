from core.checker import Checker


class Manager:
    def __init__(self):
        self.CHECKER = Checker()
        self.transferencias_aprovadas = []
        self.transferencias_rejeitadas = []

    def carregar(self, image_paths, **extract_paths):
        # Carrega comprovantes
        self.CHECKER.obter_comprovantes(image_paths)

        # Carrega extratos
        self.CHECKER.obter_transferencias(**extract_paths)

    def aprovar(self, id_transferencia):
        # Busca transferências gerais
        transferencias = self.CHECKER.transferencias_validas

        # Busca uma transferência e adiciona na lista de transferências aprovadas
        self.transferencias_aprovadas.append(transferencias[id_transferencia])

    def rejeitar(self, id_transferencia):
        # Busca transferências gerais
        transferencias = self.CHECKER.transferencias_validas

        # Busca uma transferência e adiciona na lista de transferências aprovadas
        self.transferencias_rejeitadas.append(transferencias[id_transferencia])

    def validar(self):
        # Valida comprovantes
        self.CHECKER.validar_comprovantes()

        # Retorna transferências válidas
        return {
            "validos": self.CHECKER.comprovantes_validos,
            "invalidos": self.CHECKER.comprovantes_invalidos,
        }

    def finalizar(self):
        transferencias = {
            "transferencias_aprovadas": self.transferencias_aprovadas,
            "transferencias_rejeitadas": self.transferencias_rejeitadas,
            "transferencias_validas": self.CHECKER.transferencias_validas,
        }

        return transferencias

    def clear(self):
        self.CHECKER.clear()
        self.transferencias_aprovadas = []
        self.transferencias_rejeitadas = []
