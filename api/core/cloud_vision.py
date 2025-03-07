from core.wrappers import safe_execute
from core.logger import info
from google.protobuf.json_format import MessageToDict
from google.cloud import vision
import os

# Configuração da API
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "core/chave.json"

# Inicializar o cliente da Vision API
client = vision.ImageAnnotatorClient()


@safe_execute
def extract_text(image_path):
    """
    Função para extrair texto de uma imagem.
    :param image_path: Caminho da imagem a ser analisada.
    :return: Texto extraído da imagem.
    """
    info(f"Iniciando extração de texto da imagem: {image_path}")
    with open(image_path, "rb") as image_file:
        image_data = image_file.read()

    image = vision.Image(content=image_data)
    response = client.text_detection(image=image)
    texts = MessageToDict(response._pb)

    if texts:
        info("Extração de texto concluída com sucesso.")
        return texts
    else:
        raise Exception("Nenhum texto encontrado na imagem")
