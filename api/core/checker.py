from core.helpers import (
    processar_transferencias,
    processar_comprovante,
    validar_transferencia,
)
from core.wrappers import safe_execute
from core.logger import info
import uuid


class Checker:
    def __init__(self):
        self.comprovantes_invalidos = []
        self.comprovantes_validos = []
        self.transferencias = []
        self.comprovantes = []

    @safe_execute
    def obter_transferencias(self, **extract_paths):
        """Obter transferências dos extratos"""
        # Limpar transferências
        if self.transferencias:
            self.transferencias.clear()

        # Extrair transferências
        transferencias = processar_transferencias(**extract_paths)

        # Adicionar comprovantes com id à lista de comprovantes geral
        self.transferencias = dict(
            map(lambda t: (str(uuid.uuid4()), t), transferencias)
        )

        return None

    @safe_execute
    def obter_comprovantes(self, image_paths):
        """Obter comprovantes de imagem de transferências"""

        # Lista de comprovantes locais
        local_comprovanes = []

        # Limpar comprovantes geral
        if self.comprovantes:
            self.comprovantes.clear()

        for path_image in image_paths:
            realname = path_image["realname"]
            filename = path_image["filename"]

            info(f"Iniciando processamento do comprovante: {realname}")

            # Processar comprovante com IA
            comprovante = processar_comprovante(path_image=filename)

            # Adicionar caminho do comprovante
            comprovante.update({"path": realname})

            # Adicionar comprovante à lista de comprovantes locais
            local_comprovanes.append(comprovante)

            # Informar que o comprovante foi processado
            info(f"Comprovante processado: {comprovante}")

        # Adicionar comprovantes com id à lista de comprovantes geral
        self.comprovantes = dict(
            map(lambda c: (str(uuid.uuid4()), c), local_comprovanes)
        )

        return None

    @safe_execute
    def validar_comprovantes(self):
        """Validar comprovantes de transferências"""

        for id, comprovante in self.comprovantes.items():
            # Validar transferência
            transferencia = validar_transferencia(comprovante, self.transferencias)

            if transferencia:
                comprovante.update({"banco": transferencia["banco"]})
                # Adicionar transferência validada à lista de transferências validas
                self.comprovantes_validos.append(
                    {"comprovante": {id: comprovante}, "transferencia": transferencia}
                )
            else:
                comprovante.update({"banco": "Desconhecido"})
                # Adicionar transferência inválida à lista de transferências inválidas
                self.comprovantes_invalidos.append(
                    {
                        "comprovante": {id: comprovante},
                        "transferencia": "Desconhecido",
                    }
                )

        return None

    def clear(self):
        self.comprovantes_invalidos = []
        self.comprovantes_validos = []
        self.transferencias = []
        self.comprovantes = []