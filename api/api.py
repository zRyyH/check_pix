from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router

app = FastAPI(
    title="Transferências API",
    description="API para gerenciar transferências (carregar, aprovar, rejeitar, validar e finalizar)",
    version="1.0",
)

# Configuração de CORS (ajuste conforme necessário)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclui as rotas definidas em routes.py
app.include_router(router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="localhost", port=8000)