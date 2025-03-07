from core.wrappers import safe_execute
from core.logger import info
from dotenv import load_dotenv
import openai
import json
import os

# Carrega as variáveis do arquivo .env
load_dotenv()

# Acessa as variáveis
secret_key = os.getenv("SECRET_KEY")

# Definindo a chave da API diretamente no código
openai.api_key = secret_key


@safe_execute
def ai_processor(system_message, user_message):
    try:
        info("Iniciando processamento com AI.")
        # Cria uma lista de mensagens para enviar ao modelo
        messages = [
            {
                "role": "system",
                "content": "Não mande ```json ```, Sempre Responda Com JSON\n"
                + system_message,
            },
            {
                "role": "user",
                "content": user_message,
            },
        ]

        info("Enviando requisição para a API do ChatGPT.")
        # Chama a API do ChatGPT
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini-2024-07-18",
            messages=messages,
            temperature=0,
        )

        # Captura a resposta do modelo e converte a resposta JSON para dicionário Python
        res = response["choices"][0]["message"]["content"].strip()
        res_json = json.loads(res)

        # Loga um resumo da resposta (apenas as chaves)
        info(f"Resposta da OpenAI recebida com as chaves: {list(res_json.keys())}")
        info("Processamento com AI concluído com sucesso.")
        return res_json

    except json.JSONDecodeError as json_error:
        raise (f"Erro ao decodificar JSON: {json_error}")
    except openai.error.OpenAIError as api_error:
        raise (f"Erro na API da OpenAI: {api_error}")
    except Exception as e:
        raise (f"Erro inesperado: {e}")
