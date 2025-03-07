from core.wrappers import safe_execute
from core.logger import info
from datetime import datetime
import re


@safe_execute
def format_for_generic(texto):
    info("Iniciando formatação para extrato genérico.")
    transferencias = []
    padrao = re.compile(
        r"^(?P<id>tx_\S+)\s+"
        r"(?P<type>\S+)\s+"
        r"(?P<method>\S+)\s+"
        r"(?P<amount>[-\d\.]+)\s+"
        r"(?P<fees>[-\d\.]+)\s+"
        r"(?P<net>[-\d\.]+)\s+"
        r"(?P<balance>[-\d\.]+)\s+"
        r"(?P<currency>\S+)\s+"
        r"(?P<status>\S+)\s+"
        r"(?P<description>.*?)\s+"
        r"(?P<cpf>\d{11})\s+"
        r"(?P<e2e>\S+)\s+"
        r"(?P<datetime>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})",
        re.IGNORECASE,
    )

    for linha in texto.splitlines():
        linha = linha.strip()
        if not linha:
            continue
        if linha.startswith("ID Type Method"):
            continue
        m = padrao.search(linha)
        if m:
            if m.group("type").lower() != "inbound":
                continue
            try:
                valor = float(m.group("amount"))
            except ValueError:
                continue
            dt_str = m.group("datetime")
            dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
            data_formatada = dt.strftime("%d/%m/%Y")
            desc = m.group("description").strip()
            desc_lower = desc.lower()
            if desc_lower.startswith("inbound payment "):
                nome = desc[len("inbound payment ") :].strip()
            elif desc_lower.startswith("pix para fast ltda "):
                nome = desc[len("pix para fast ltda ") :].strip()
            else:
                nome = desc

            transferencias.append(
                {
                    "nome": nome,
                    "valor": valor,
                    "data": data_formatada,
                    "banco": "generic",
                }
            )
    info(
        f"Formatação para extrato genérico concluída. {len(transferencias)} transferências encontradas."
    )
    return transferencias


@safe_execute
def format_for_digital(texto):
    info("Iniciando formatação para extrato digital.")
    transferencias = []
    padrao = re.compile(
        r"^(?P<data>\d{2}/\d{2}/\d{4})\s+\d{2}:\d{2}:\d{2}\s+Crédito PIX\s+(?P<nome>.+?)\s*(?:\([^)]*\))?\s*\+\s+R\$ (?P<valor>[\d\.,]+)\s+CRÉDITO",
        re.IGNORECASE,
    )
    for linha in texto.splitlines():
        linha = linha.strip()
        if not linha:
            continue
        match = padrao.search(linha)
        if match:
            data = match.group("data").strip()
            nome = match.group("nome").strip().upper()
            valor_str = match.group("valor").strip().replace(".", "").replace(",", ".")
            valor = float(valor_str)
            transferencias.append(
                {"nome": nome, "valor": valor, "data": data, "banco": "digital"}
            )
    info(
        f"Formatação para extrato digital concluída. {len(transferencias)} transferências encontradas."
    )
    return transferencias


@safe_execute
def format_for_itau(texto):
    info("Iniciando formatação para extrato Itaú.")
    transferencias = []
    padrao = re.compile(
        r"^PIX\s+TRANSF\s+(?P<nome>.+?)(?P<data>\d{1,2}/\d{1,2})\s+(?P<valor>[\d\.,]+)"
    )
    for linha in texto.splitlines():
        linha = linha.strip()
        m = padrao.search(linha)
        if m:
            nome = m.group("nome").strip().upper()
            data_parcial = m.group("data").strip()
            data_formatada = f"{data_parcial}/2025"
            valor_str = m.group("valor").strip().replace(".", "").replace(",", ".")
            valor = float(valor_str)
            transferencias.append(
                {
                    "nome": nome,
                    "valor": valor,
                    "data": data_formatada,
                    "banco": "itau",
                }
            )
    info(
        f"Formatação para extrato Itaú concluída. {len(transferencias)} transferências encontradas."
    )
    return transferencias


@safe_execute
def format_for_corpx(texto):
    info("Iniciando formatação para extrato Corpx.")
    transferencias = []
    linhas = texto.splitlines()
    linhas_unificadas = []
    data_pattern = re.compile(r"^\d{2}/\d{2}/\d{4}")
    for linha in linhas:
        linha = linha.strip()
        if data_pattern.match(linha):
            linhas_unificadas.append(linha)
        else:
            if linhas_unificadas:
                linhas_unificadas[-1] += " " + linha
            else:
                linhas_unificadas.append(linha)

    padrao = re.compile(
        r"^(?P<data>\d{2}/\d{2}/\d{4})\s*TRANS RECEBIDA PIX - (?P<nome>.*?)\-[\d\./-]+R\$ (?P<valor>[\d\.,]+) C"
    )
    for linha in linhas_unificadas:
        resultado = padrao.search(linha)
        if resultado:
            data_br = resultado.group("data")
            dia, mes, ano = data_br.split("/")
            data_formatada = f"{dia}/{mes}/{ano}"
            nome = resultado.group("nome").strip()
            valor_str = (
                resultado.group("valor").strip().replace(".", "").replace(",", ".")
            )
            valor = float(valor_str)
            transferencias.append(
                {
                    "nome": nome,
                    "valor": valor,
                    "data": data_formatada,
                    "banco": "corpx",
                }
            )
    info(
        f"Formatação para extrato Corpx concluída. {len(transferencias)} transferências encontradas."
    )
    return transferencias
