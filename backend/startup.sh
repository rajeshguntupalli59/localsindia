#!/bin/bash
pip install --upgrade --force-reinstall setuptools
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
