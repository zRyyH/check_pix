from core.extractor import extract_content
from core.cloud_vision import extract_text
from core.wrappers import safe_execute
from core.utils import compare_names
from core.ai import ai_processor
from core.logger import info
from core.formatter import (
    format_for_itau,
    format_for_corpx,
    format_for_digital,
    format_for_generic,
)


@safe_execute
def processar_transferencias(corpx="", itau="", digital="", generico=""):
    """Obter transferências dos extratos"""
    info("Iniciando extração de transferências dos extratos.")
    transfers = []

    if corpx:
        print(corpx)
        corpx_content = extract_content(corpx)
        corpx_tranfers = format_for_corpx(corpx_content)
        transfers.extend(corpx_tranfers)

    if itau:
        print(itau)
        itau_content = extract_content(itau)
        itau_tranfers = format_for_itau(itau_content)
        transfers.extend(itau_tranfers)

    if digital:
        print(digital)
        digital_content = extract_content(digital)
        digital_tranfers = format_for_digital(digital_content)
        transfers.extend(digital_tranfers)

    if generico:
        print(generico)
        generic_content = extract_content(generico)
        generic_tranfers = format_for_generic(generic_content)
        transfers.extend(generic_tranfers)

    log = "Transferências extraídas dos extratos: {}".format(transfers)
    
    info(log)

    return transfers


@safe_execute
def processar_comprovante(path_image):
    """Obter informações do comprovante de transferência"""
    info(f"Iniciando processamento do comprovante: {path_image}")
    SYSTEM_MESSAGE_AI = """
    Analise esse JSON do cloud vision e retorne um JSON com as informações da transferência.
    Caso não ache o nome de quem enviou, retorne "nome": "".
    Caso ache o nome de quem enviou, retorne "nome": "Fulano de Tal".
    Retorne nesse formato:
    {"nome": "Fulano de Tal", "valor": 100.0, "data": "01/01/2025"}
    """

    if path_image.split(".")[-1] != "pdf":
        comprovante_content = extract_text(path_image)["textAnnotations"][0][
            "description"
        ]
    else:
        comprovante_content = extract_content(path_image)

    dados_comprovante = ai_processor(SYSTEM_MESSAGE_AI, comprovante_content)
    info(f"Comprovante processado com OpenAI. Informações obtidas: {dados_comprovante}")
    return dados_comprovante


@safe_execute
def validar_comprovante(comprovante, transfer):
    """Validar comprovante com transferência"""
    c_nome, c_valor, c_data = (
        comprovante["nome"],
        comprovante["valor"],
        comprovante["data"],
    )
    t_nome, t_valor, t_data = transfer["nome"], transfer["valor"], transfer["data"]

    isValue = t_valor == c_valor
    isDate = t_data == c_data
    isName = compare_names(c_nome, t_nome)

    return isValue and isDate, isName


@safe_execute
def validar_transferencia(comprovante, transfers):
    """Obter transferência validada com maior confiança"""
    info("Iniciando validação do comprovante com as transferências extraídas.")
    melhor_transferencia = {"confianca": 0}

    for id, transfer in transfers.items():
        validated, confianca = validar_comprovante(comprovante, transfer)
        if (
            validated
            and confianca >= melhor_transferencia["confianca"]
            and confianca >= 0.5
        ):

            melhor_transferencia = {
                id: transfer,
                "banco": transfer["banco"],
                "confianca": confianca,
            }

    info(
        f"Transferência estimada: {melhor_transferencia} para o comprovante: {comprovante}"
    )

    if len(melhor_transferencia.keys()) > 1:
        return melhor_transferencia
    return None
