FROM python:3.14-rc-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV HF_HOME=/app/.cache/huggingface
ENV VIRTUAL_ENV=/app/.venv
ENV PATH="/app/.venv/bin:$PATH"


COPY pyproject.toml uv.lock* requirements.txt* /app/

RUN --mount=type=cache,target=/root/.cache/uv \
    if [ -f requirements.txt ]; then uv pip install --system -r requirements.txt; fi

COPY . /app

RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('FremyCompany/BioLORD-2023', prompts={'retrieval': 'Represent this sentence for searching relevant passages: '})"

RUN chmod -R 777 /app/.cache

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "query:app", "--host", "0.0.0.0", "--port", "8000"]