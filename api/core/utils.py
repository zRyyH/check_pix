from core.wrappers import safe_execute
import difflib
import re


@safe_execute
def normalize_name(name):
    """
    Converte o nome para maiúsculas, remove dígitos, sinais de pontuação (como pontos, vírgulas, sinais de '=')
    e palavras irrelevantes para retornar uma lista de tokens significativos.
    """
    name = name.upper()
    name = re.sub(r"[\d\.\,=]", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    tokens = name.split(" ")
    stopwords = {"DO", "DA", "DE", "D", "DOS", "DAS"}
    tokens = [t for t in tokens if t not in stopwords]
    return tokens


@safe_execute
def token_match(token1, token2, threshold=0.8):
    """
    Retorna True se os tokens forem iguais, se um for inicial do outro ou se a similaridade for maior ou igual ao threshold.
    """
    if token1 == token2:
        return True
    if len(token1) == 1 and token2.startswith(token1):
        return True
    if len(token2) == 1 and token1.startswith(token2):
        return True
    similarity = difflib.SequenceMatcher(None, token1, token2).ratio()
    return similarity >= threshold


@safe_execute
def compare_names(name1, name2):
    """
    Compara dois nomes normalizados dividindo-os em tokens e verificando a proporção de tokens correspondentes.
    """
    tokens1 = normalize_name(name1)
    tokens2 = normalize_name(name2)

    if not tokens1 or not tokens2:
        return 0

    match_count = 0
    for t1 in tokens1:
        for t2 in tokens2:
            if token_match(t1, t2):
                match_count += 1
                break

    min_tokens = min(len(tokens1), len(tokens2))
    if min_tokens == 1:
        return 0

    ratio = match_count / min_tokens
    return ratio
