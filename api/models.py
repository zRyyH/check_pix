from pydantic import BaseModel
from typing import List, Dict


class CarregarRequest(BaseModel):
    image_paths: List[str]
    extract_paths: Dict[str, str] = {}


class TransferenciaRequest(BaseModel):
    id_transferencia: str