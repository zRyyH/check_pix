from datetime import datetime
import uuid
import os


async def write_extratos(corpx, itau, digital, generico):
    # Cria o diretório caso não exista
    os.makedirs("core/extratos", exist_ok=True)

    extratos = {}

    for arquivo in [corpx, itau, digital, generico]:
        if not arquivo:
            continue

        id = uuid.uuid4()
        data = datetime.now().strftime("%d-%m-%Y")
        ext = arquivo.filename.split(".")[-1]

        # Extrai o nome do banco do nome do arquivo
        banco = arquivo.headers["content-disposition"].split('name="')[1].split('";')[0]

        filename = f"core/extratos/{banco}_{data}_{id}.{ext}"

        with open(filename, "wb") as File:
            File.write(await arquivo.read())

        extratos.update({banco: filename})

    return extratos


async def write_comprovantes(comprovantes):
    # Cria o diretório caso não exista
    os.makedirs("core/comprovantes", exist_ok=True)

    paths = []

    for comprovante in comprovantes:
        id = uuid.uuid4()
        data = datetime.now().strftime("%d-%m-%Y")
        ext = comprovante.filename.split(".")[-1]

        filename = f"core/comprovantes/{data}_{id}.{ext}"

        with open(filename, "wb") as File:
            File.write(await comprovante.read())

        paths.append({"realname": comprovante.filename, "filename": filename})

    return paths
